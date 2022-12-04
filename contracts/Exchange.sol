// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;
import "./GovToken.sol";

contract Exchange {
    address public token;
    uint256 public price;              // the price, in wei, per token
    address owner;
    
    event Bought(uint256 amount);
    event Sold(uint256 amount);
    
    constructor(address _token, uint256 _price) {
        owner = msg.sender;
        token =_token;
        price = _price;
    }
    
    function buy(uint numTokens) payable public {
        require(msg.value == safeMultiply(numTokens, price), "Check price per token and send apporpriate wei");
        uint256 dexBalance = GovToken(token).balanceOf(address(this));
        require(numTokens > 0, "You need to send some ether");
        require(numTokens <= dexBalance, "Not enough tokens in the reserve");
        require(GovToken(token).transfer(msg.sender, numTokens));
        emit Bought(numTokens);
    }

    function sell(uint256 amount) public {
        require(amount > 0, "You need to sell at least some tokens");
        uint256 allowance = GovToken(token).allowance(msg.sender, address(this));
        require(allowance >= amount, "Check the token allowance");
        uint256 balanceInWei = address(this).balance;
        uint256 weiToSend = safeMultiply(amount, price);
        require(weiToSend < balanceInWei, "Not enough balance with DEX");
        require(GovToken(token).transferFrom(msg.sender, address(this), amount));
        payable(msg.sender).transfer(weiToSend);
        emit Sold(amount);
    }
    
    // Guards against integer overflows
    function safeMultiply(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        } else {
            uint256 c = a * b;
            assert(c / a == b);
            return c;
        }
    }
}