// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../contracts/VaultV3.sol";
import "../contracts/AaveStrategy.sol";

interface IBaseAavePool {
    struct ReserveData {
        uint256 configuration;
        uint128 liquidityIndex;
        uint128 currentLiquidityRate;
        uint128 variableBorrowIndex;
        uint128 currentVariableBorrowRate;
        uint128 currentStableBorrowRate;
        uint40 lastUpdateTimestamp;
        uint16 id;
        address aTokenAddress;
        address stableDebtTokenAddress;
        address variableDebtTokenAddress;
        address interestRateStrategyAddress;
        uint128 accruedToTreasury;
        uint128 unbacked;
        uint128 isolationModeTotalDebt;
    }

    function getReserveData(address asset) external view returns (ReserveData memory);
}

contract RevertingPool {
    function getReserveData(address)
        external
        pure
        returns (IBaseAavePool.ReserveData memory)
    {
        revert("bad pool");
    }

    function supply(address, uint256, address, uint16) external pure {
        revert("bad pool");
    }

    function withdraw(address, uint256, address) external pure returns (uint256) {
        revert("bad pool");
    }
}

contract ForkBaseTest is Test {
    address constant BASE_AAVE_POOL = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5;
    address constant BASE_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    uint256 constant DEPOSIT_AMOUNT = 1_000e6;
    uint256 constant DIVEST_AMOUNT = 500e6;
    uint256 constant ROUNDING_TOLERANCE = 2;

    VaultV3 internal vault;
    AaveStrategy internal strategy;
    IERC20 internal usdc;
    IBaseAavePool internal pool;

    function setUp() public {
        vm.createSelectFork(vm.envString("BASE_RPC_URL"));

        vault = new VaultV3();
        strategy = new AaveStrategy(address(vault), BASE_USDC, BASE_AAVE_POOL);
        vault.setStrategy(address(strategy));

        usdc = IERC20(BASE_USDC);
        pool = IBaseAavePool(BASE_AAVE_POOL);

        deal(BASE_USDC, address(this), 100_000e6);
        usdc.approve(address(vault), type(uint256).max);
    }

    function testForkDepositRealUsdc() public {
        vault.depositToken(BASE_USDC, DEPOSIT_AMOUNT);

        assertEq(vault.getTokenBalance(BASE_USDC, address(this)), DEPOSIT_AMOUNT);
        assertEq(usdc.balanceOf(address(vault)), DEPOSIT_AMOUNT);
    }

    function testForkInvestIntoRealAave() public {
        vault.depositToken(BASE_USDC, DEPOSIT_AMOUNT);

        uint256 vaultBalanceBefore = usdc.balanceOf(address(vault));
        vault.invest(BASE_USDC, DEPOSIT_AMOUNT);

        assertEq(usdc.balanceOf(address(vault)), vaultBalanceBefore - DEPOSIT_AMOUNT);
        assertEq(usdc.balanceOf(address(strategy)), 0);
        assertApproxEqAbs(strategy.totalAssets(), DEPOSIT_AMOUNT, ROUNDING_TOLERANCE);
        assertTrue(strategy.aToken() != address(0));
    }

    function testForkTotalAssetsReflectsRealATokenBalance() public {
        vault.depositToken(BASE_USDC, DEPOSIT_AMOUNT);
        vault.invest(BASE_USDC, DEPOSIT_AMOUNT);

        address aToken = strategy.aToken();
        uint256 aTokenBalance = IERC20(aToken).balanceOf(address(strategy));

        assertTrue(aToken != address(0));
        assertEq(strategy.totalAssets(), aTokenBalance);
        assertApproxEqAbs(strategy.totalAssets(), DEPOSIT_AMOUNT, ROUNDING_TOLERANCE);
    }

    function testForkDivestFromRealAave() public {
        vault.depositToken(BASE_USDC, DEPOSIT_AMOUNT);
        vault.invest(BASE_USDC, DEPOSIT_AMOUNT);

        uint256 vaultBalanceBefore = usdc.balanceOf(address(vault));
        vault.divest(DIVEST_AMOUNT);

        assertEq(usdc.balanceOf(address(vault)), vaultBalanceBefore + DIVEST_AMOUNT);
        assertApproxEqAbs(strategy.totalAssets(), DEPOSIT_AMOUNT - DIVEST_AMOUNT, ROUNDING_TOLERANCE);
    }

    function testForkFullCycleDepositInvestDivestWithdraw() public {
        uint256 walletBalanceBefore = usdc.balanceOf(address(this));

        vault.depositToken(BASE_USDC, DEPOSIT_AMOUNT);
        vault.invest(BASE_USDC, DEPOSIT_AMOUNT);
        uint256 strategyAssets = strategy.totalAssets();
        vault.divest(strategyAssets);
        vault.withdrawToken(BASE_USDC, strategyAssets);

        assertLe(vault.getTokenBalance(BASE_USDC, address(this)), ROUNDING_TOLERANCE);
        assertEq(strategy.totalAssets(), 0);
        assertApproxEqAbs(usdc.balanceOf(address(this)), walletBalanceBefore, ROUNDING_TOLERANCE);
    }

    function testForkReadRealApy() public {
        IBaseAavePool.ReserveData memory reserveData = pool.getReserveData(BASE_USDC);

        emit log_named_uint("Base currentLiquidityRate", reserveData.currentLiquidityRate);
        emit log_named_address("Base aUSDC", reserveData.aTokenAddress);

        assertGt(reserveData.currentLiquidityRate, 0);
        assertTrue(reserveData.aTokenAddress != address(0));
    }

    function testForkStrategyFailureIsolation() public {
        RevertingPool badPool = new RevertingPool();
        AaveStrategy badStrategy = new AaveStrategy(address(vault), BASE_USDC, address(badPool));
        vault.setStrategy(address(badStrategy));

        vault.depositToken(BASE_USDC, DEPOSIT_AMOUNT);
        uint256 vaultBalanceBefore = usdc.balanceOf(address(vault));

        vm.expectRevert("Strategy deposit failed - tokens returned to vault");
        vault.invest(BASE_USDC, DEPOSIT_AMOUNT);

        assertEq(usdc.balanceOf(address(vault)), vaultBalanceBefore);
        assertEq(badStrategy.totalAssets(), 0);
    }
}
