// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../contracts/VaultV4.sol";
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

interface IBaseAToken {
    function UNDERLYING_ASSET_ADDRESS() external view returns (address);
    function POOL() external view returns (address);
}

contract ForkBaseTest is Test {
    address constant BASE_AAVE_POOL = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5;
    address constant BASE_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    uint256 constant DEPOSIT_AMOUNT = 1_000e6;
    uint256 constant BASE_FORK_BLOCK = 51_246_242;
    address constant BASE_ATOKEN = 0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB;
    uint256 constant DIVEST_AMOUNT = 500e6;
    uint256 constant ROUNDING_TOLERANCE = 2;

    VaultV4 internal vault;
    AaveStrategy internal strategy;
    IERC20 internal usdc;
    IBaseAavePool internal pool;

    function setUp() public {
        vm.createSelectFork(vm.envString("BASE_RPC_URL"), BASE_FORK_BLOCK);
        assertEq(block.chainid, 8453);
        assertEq(block.number, BASE_FORK_BLOCK);

        usdc = IERC20(BASE_USDC);
        pool = IBaseAavePool(BASE_AAVE_POOL);
        assertGt(BASE_USDC.code.length, 0);
        assertGt(BASE_AAVE_POOL.code.length, 0);
        assertEq(IERC20Metadata(BASE_USDC).decimals(), 6);
        assertEq(pool.getReserveData(BASE_USDC).aTokenAddress, BASE_ATOKEN);
        assertGt(BASE_ATOKEN.code.length, 0);
        assertEq(IBaseAToken(BASE_ATOKEN).UNDERLYING_ASSET_ADDRESS(), BASE_USDC);
        assertEq(IBaseAToken(BASE_ATOKEN).POOL(), BASE_AAVE_POOL);

        vault = new VaultV4(BASE_USDC);
        strategy = new AaveStrategy(address(vault), BASE_USDC, BASE_AAVE_POOL);
        vault.setStrategy(address(strategy));
        vault.setDepositCap(type(uint256).max);

        deal(BASE_USDC, address(this), 100_000e6);
        usdc.approve(address(vault), type(uint256).max);
    }

    function testForkDepositRealUsdc() public {
        uint256 shares = vault.deposit(DEPOSIT_AMOUNT, address(this));
        assertEq(shares, vault.balanceOf(address(this)));
        assertEq(usdc.balanceOf(address(vault)), DEPOSIT_AMOUNT);
    }

    function testForkInvestIntoRealAave() public {
        vault.deposit(DEPOSIT_AMOUNT, address(this));

        uint256 vaultBalanceBefore = usdc.balanceOf(address(vault));
        vault.invest(DEPOSIT_AMOUNT);

        assertEq(usdc.balanceOf(address(vault)), vaultBalanceBefore - DEPOSIT_AMOUNT);
        assertEq(usdc.balanceOf(address(strategy)), 0);
        assertApproxEqAbs(strategy.totalAssets(), DEPOSIT_AMOUNT, ROUNDING_TOLERANCE);
        assertEq(strategy.aToken(), BASE_ATOKEN);
    }

    function testForkTotalAssetsReflectsRealATokenBalance() public {
        vault.deposit(DEPOSIT_AMOUNT, address(this));
        vault.invest(DEPOSIT_AMOUNT);

        address aToken = strategy.aToken();
        uint256 aTokenBalance = IERC20(aToken).balanceOf(address(strategy));

        assertTrue(aToken != address(0));
        assertEq(strategy.totalAssets(), aTokenBalance);
        assertApproxEqAbs(strategy.totalAssets(), DEPOSIT_AMOUNT, ROUNDING_TOLERANCE);
    }

    function testForkDivestFromRealAave() public {
        vault.deposit(DEPOSIT_AMOUNT, address(this));
        vault.invest(DEPOSIT_AMOUNT);

        uint256 vaultBalanceBefore = usdc.balanceOf(address(vault));
        vault.divest(DIVEST_AMOUNT, DIVEST_AMOUNT - ROUNDING_TOLERANCE);

        assertEq(usdc.balanceOf(address(vault)), vaultBalanceBefore + DIVEST_AMOUNT);
        assertApproxEqAbs(strategy.totalAssets(), DEPOSIT_AMOUNT - DIVEST_AMOUNT, ROUNDING_TOLERANCE);
    }

    function testForkFullCycleDepositInvestDivestWithdraw() public {
        uint256 walletBalanceBefore = usdc.balanceOf(address(this));

        uint256 shares = vault.deposit(DEPOSIT_AMOUNT, address(this));
        vault.invest(DEPOSIT_AMOUNT);
        uint256 strategyAssets = strategy.totalAssets();
        vault.divest(strategyAssets, strategyAssets - ROUNDING_TOLERANCE);
        uint256 redeemed = vault.redeem(shares, address(this), address(this));

        assertApproxEqAbs(redeemed, DEPOSIT_AMOUNT, ROUNDING_TOLERANCE);
        assertEq(strategy.totalAssets(), 0);
        assertApproxEqAbs(usdc.balanceOf(address(this)), walletBalanceBefore, ROUNDING_TOLERANCE);
    }
}
