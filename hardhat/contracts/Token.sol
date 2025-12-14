// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.17;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Token is IERC20, Ownable {

   string public name;
   string public symbol;
   uint8 public decimals;
   uint256 private _totalSupply;
  
   mapping(address => uint256) private _balances;
   mapping(address => mapping(address => uint256)) private _allowances;
  
   constructor() Ownable(msg.sender) {
       _totalSupply = 200000000000000000000000;
       _balances[msg.sender] = _totalSupply;
       name = "Bafoka Token";
       symbol = "BFK";
       decimals = 18;
      
       emit Transfer(address(0), msg.sender, _totalSupply);
   }

   function mint(address to, uint256 amount) public onlyOwner {
       _totalSupply += amount;
       _balances[to] += amount;
       emit Transfer(address(0), to, amount);
   }
  
   function totalSupply() public view override returns (uint256) {
       return _totalSupply;
   }
  
   function balanceOf(address account) public view override returns (uint256) {
       return _balances[account];
   }
  
   function transfer(address recipient, uint256 amount) public override returns (bool) {
       require(recipient != address(0), "ERC20: transfer to the zero address");
       require(_balances[msg.sender] >= amount, "ERC20: transfer amount exceeds balance");
      
       _balances[msg.sender] -= amount;
       _balances[recipient] += amount;
      
       emit Transfer(msg.sender, recipient, amount);
      
       return true;
   }
  
   function allowance(address owner, address spender) public view override returns (uint256) {
       return _allowances[owner][spender];
   }
  
   function approve(address spender, uint256 amount) public override returns (bool) {
       _allowances[msg.sender][spender] = amount;
      
       emit Approval(msg.sender, spender, amount);
      
       return true;
   }
  
   function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
       require(recipient != address(0), "ERC20: transfer to the zero address");
       require(_balances[sender] >= amount, "ERC20: transfer amount exceeds balance");
       require(_allowances[sender][msg.sender] >= amount, "ERC20: transfer amount exceeds allowance");
      
       _balances[sender] -= amount;
       _balances[recipient] += amount;
       _allowances[sender][msg.sender] -= amount;
      
       emit Transfer(sender, recipient, amount);
      
       return true;
   }
}
