// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
pragma experimental ABIEncoderV2;

/// @title Basic contract to execute flashloan with dydx
/// @author Red Graz
/// @notice Use this contract as basis for DeFi with flashloans
/// @dev Compiler for v0.5.7 is used due to @studydefi/money-legos dependency contracts. 
/// @dev To use newer compiler version, bring the money-legos contracts into this project and massage them to work with it.

import "@studydefi/money-legos/dydx/contracts/DydxFlashloanBase.sol";
import "@studydefi/money-legos/dydx/contracts/ICallee.sol";

contract TestDyDxSoloMargin is ICallee, DydxFlashloanBase {
    address private constant SOLO = 0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e;
    address public flashUser;
    event Log(string message, uint val);

    struct MyCustomData {
        address token;
        uint repayAmount;
    }

    /// @dev allow funding of the contract when compiled with Solidity < v0.6

    function() external payable {}

    function initiateFlashLoan(address _token, uint _amount) external {
        ISoloMargin solo = ISoloMargin(SOLO);

        /// @dev Market ID depends on coin: 0 for WETH, 1 - SAI, 2 - USDC and 3 - DAI
        uint marketId = _getMarketIdFromTokenAddress(SOLO, _token);
        /// @dev Calculate repayment amount (_amount + 2 wei)
        uint repayAmount = _getRepaymentAmountInternal(_amount);

        /// @dev approve the repayment of the flash loabn
        IERC20(_token).approve(SOLO, repayAmount);

       /// @dev Flash loan logic: withdraw, call callFunction() and repay loan

       Actions.ActionArgs[] memory operations = new Actions.ActionArgs[](3);
       operations[0] = _getWithdrawAction(marketId, _amount);
       operations[1] = _getCallAction(
        abi.encode(MyCustomData({token: _token, repayAmount: repayAmount}))
       );
       operations[2] = _getDepositAction(marketId, repayAmount);

       Account.Info[] memory accountInfos = new Account.Info[](1);
       accountInfos[0] = _getAccountInfo();

       solo.operate(accountInfos, operations);
    }

    function callFunction(
        address sender,
        Account.Info memory account,
        bytes memory data
    ) public {
        require(msg.sender == SOLO, "Just SOLO contract is allowed to execute this function!");
        require(sender == address(this), "Just this contract is allowed to initiate this function!");

        MyCustomData memory mcd = abi.decode(data, (MyCustomData));
        uint repayAmount = mcd.repayAmount;

        uint bal = IERC20(mcd.token).balanceOf(address(this));
        require(bal >= repayAmount, "The balance of this contract is less than repayment amount!");

        /// @dev Here's the place for custom code to profit
        flashUser = sender;
        emit Log("Balance of contract: ", bal);
        emit Log("Repayment amount: ", repayAmount);
        emit Log("Balance of contract after the loan is repaid: ", bal - repayAmount);
    }
}