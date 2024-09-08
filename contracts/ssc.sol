// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleStableCoin is ERC20, Ownable {
    uint8 private constant _DECIMALS = 6;
    uint256 private constant _INITIAL_SUPPLY = 1_000_000 * 10**_DECIMALS; // 1 million tokens

    constructor() ERC20("SimpleStableCoin", "SSC") Ownable(msg.sender) {
        _mint(msg.sender, _INITIAL_SUPPLY);
    }

    function decimals() public view virtual override returns (uint8) {
        return _DECIMALS;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}