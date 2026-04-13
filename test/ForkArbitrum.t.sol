// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../contracts/VaultV3.sol";
import "../contracts/AaveStrategy.sol";

interface IArbitrumAavePool {
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

contract ArbitrumRevertingPool {
    function getReserveData(address)
        external
        pure
        returns (IArbitrumAavePool.ReserveData memory)
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

contract ForkArbitrumTest is Test {
    address constant ARBITRUM_AAVE_POOL = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    address constant ARBITRUM_USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;

    uint256 constant DEPOSIT_AMOUNT = 1_000e6;
    uint256 constant DIVEST_AMOUNT = 500e6;
    uint256 constant ROUNDING_TOLERANCE = 2;

    VaultV3 internal vault;
    AaveStrategy internal strategy;
    IERC20 internal usdc;
    IArbitrumAavePool internal pool;

    function setUp() public {
        vm.createSelectFork(vm.envString("ARBITRUM_RPC_URL"));

        vault = new VaultV3();
        strategy = new AaveStrategy(address(vault), ARBITRUM_USDC, ARBITRUM_AAVE_POOL);
        vault.setStrategy(address(strategy));

        usdc = IERC20(ARBITRUM_USDC);
        pool = IArbitrumAavePool(ARBITRUM_AAVE_POOL);

        deal(ARBITRUM_USDC, address(this), 100_000e6);
        usdc.approve(address(vault), type(uint256).max);
    }

    function testForkDepositRealUsdc() public {
        vault.depositToken(ARBITRUM_USDC, DEPOSIT_AMOUNT);

        assertEq(vault.getTokenBalance(ARBITRUM_USDC, address(this)), DEPOSIT_AMOUNT);
        assertEq(usdc.balanceOf(address(vault)), DEPOSIT_AMOUNT);
    }

    function testForkInvestIntoRealAave() public {
        vault.depositToken(ARBITRUM_USDC, DEPOSIT_AMOUNT);

        uint256 vaultBalanceBefore = usdc.balanceOf(address(vault));
        vault.invest(ARBITRUM_USDC, DEPOSIT_AMOUNT);

        assertEq(usdc.balanceOf(address(vault)), vaultBalanceBefore - DEPOSIT_AMOUNT);
        assertEq(usdc.balanceOf(address(strategy)), 0);
        assertApproxEqAbs(strategy.totalAssets(), DEPOSIT_AMOUNT, ROUNDING_TOLERANCE);
        assertTrue(strategy.aToken() != address(0));
    }

    function testForkTotalAssetsReflectsRealATokenBalance() public {
        vault.depositToken(ARBITRUM_USDC, DEPOSIT_AMOUNT);
        vault.invest(ARBITRUM_USDC, DEPOSIT_AMOUNT);

        address aToken = strategy.aToken();
        uint256 aTokenBalance = IERC20(aToken).balanceOf(address(strategy));

        assertTrue(aToken != address(0));
        assertEq(strategy.totalAssets(), aTokenBalance);
        assertApproxEqAbs(strategy.totalAssets(), DEPOSIT_AMOUNT, ROUNDING_TOLERANCE);
    }

    function testForkDivestFromRealAave() public {
        vault.depositToken(ARBITRUM_USDC, DEPOSIT_AMOUNT);
        vault.invest(ARBITRUM_USDC, DEPOSIT_AMOUNT);

        uint256 vaultBalanceBefore = usdc.balanceOf(address(vault));
        vault.divest(DIVEST_AMOUNT);

        assertEq(usdc.balanceOf(address(vault)), vaultBalanceBefore + DIVEST_AMOUNT);
        assertApproxEqAbs(strategy.totalAssets(), DEPOSIT_AMOUNT - DIVEST_AMOUNT, ROUNDING_TOLERANCE);
    }

    function testForkFullCycleDepositInvestDivestWithdraw() public {
        uint256 walletBalanceBefore = usdc.balanceOf(address(this));

        vault.depositToken(ARBITRUM_USDC, DEPOSIT_AMOUNT);
        vault.invest(ARBITRUM_USDC, DEPOSIT_AMOUNT);
        uint256 strategyAssets = strategy.totalAssets();
        vault.divest(strategyAssets);
        vault.withdrawToken(ARBITRUM_USDC, strategyAssets);

        assertLe(vault.getTokenBalance(ARBITRUM_USDC, address(this)), ROUNDING_TOLERANCE);
        assertEq(strategy.totalAssets(), 0);
        assertApproxEqAbs(usdc.balanceOf(address(this)), walletBalanceBefore, ROUNDING_TOLERANCE);
    }

    function testForkReadRealApy() public {
        IArbitrumAavePool.ReserveData memory reserveData = pool.getReserveData(ARBITRUM_USDC);

        emit log_named_uint("Arbitrum currentLiquidityRate", reserveData.currentLiquidityRate);
        emit log_named_address("Arbitrum aUSDC", reserveData.aTokenAddress);

        assertGt(reserveData.currentLiquidityRate, 0);
        assertTrue(reserveData.aTokenAddress != address(0));
    }

    function testForkStrategyFailureIsolation() public {
        ArbitrumRevertingPool badPool = new ArbitrumRevertingPool();
        AaveStrategy badStrategy = new AaveStrategy(address(vault), ARBITRUM_USDC, address(badPool));
        vault.setStrategy(address(badStrategy));

        vault.depositToken(ARBITRUM_USDC, DEPOSIT_AMOUNT);
        uint256 vaultBalanceBefore = usdc.balanceOf(address(vault));

        vm.expectRevert("Strategy deposit failed - tokens returned to vault");
        vault.invest(ARBITRUM_USDC, DEPOSIT_AMOUNT);

        assertEq(usdc.balanceOf(address(vault)), vaultBalanceBefore);
        assertEq(badStrategy.totalAssets(), 0);
    }
}
