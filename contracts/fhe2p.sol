// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@fhenixprotocol/contracts/FHE.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract FHE2P is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Voucher {
        euint256 encryptedCode;
        euint32 price;
        ebool isRevealed;
        eaddress owner;
        eaddress seller; 
    }

    mapping(uint256 => Voucher) public vouchers;
    uint256 public voucherCount;
    IERC20 public stablecoin;
    uint64 public platformFee;
    uint256 public constant FEE_DENOMINATOR = 10000;

    event VoucherListed(uint256 indexed voucherId);
    event VoucherPurchased(uint256 indexed voucherId, address buyer);
    event VoucherRevealed(uint256 indexed voucherId);
    event VoucherResold(uint256 indexed voucherId);
    event PlatformFeeUpdated(uint256 newFee);
    event FundsWithdrawn(address to, uint256 amount);

    constructor(address _stablecoinAddress, uint32 _initialFee) Ownable(msg.sender) {
        stablecoin = IERC20(_stablecoinAddress);
        platformFee = _initialFee;
    }

    function listVoucher(euint256 _encryptedCode, euint32 _price) external onlyOwner {
        voucherCount++;
        vouchers[voucherCount] = Voucher({
            encryptedCode: _encryptedCode,
            price: _price,
            isRevealed: FHE.asEbool(false),
            owner: FHE.asEaddress(address(this)),
            seller: FHE.asEaddress(address(0))
        });

        emit VoucherListed(voucherCount);
    }


    function buyVoucher(uint256 _voucherId) external whenNotPaused nonReentrant {
        Voucher storage voucher = vouchers[_voucherId];
        FHE.req(FHE.eq(voucher.owner, FHE.asEaddress(address(this))));
        FHE.req(FHE.eq(voucher.seller, FHE.asEaddress(address(0))));

        uint256 decryptedPrice = FHE.decrypt(voucher.price);
        stablecoin.safeTransferFrom(msg.sender, address(this), decryptedPrice);

        voucher.owner = FHE.asEaddress(msg.sender);
        emit VoucherPurchased(_voucherId, msg.sender);
    }

     function buyResoldVoucher(uint256 _voucherId) external whenNotPaused nonReentrant {
        Voucher storage voucher = vouchers[_voucherId];
        FHE.req(FHE.eq(voucher.owner, FHE.asEaddress(address(this))));
        FHE.req(FHE.ne(voucher.seller, FHE.asEaddress(address(0))));

        euint32 fee = FHE.div(FHE.mul(voucher.price, FHE.asEuint32(platformFee)), FHE.asEuint32(FEE_DENOMINATOR));
        euint32 sellerAmount = FHE.sub(voucher.price, fee);

        stablecoin.safeTransferFrom(msg.sender, address(this), FHE.decrypt(voucher.price));
        stablecoin.safeTransfer(FHE.decrypt(voucher.seller), FHE.decrypt(sellerAmount));

        voucher.owner = FHE.asEaddress(msg.sender);
        voucher.seller = FHE.asEaddress(address(0)); // Reset seller after purchase

        emit VoucherPurchased(_voucherId, msg.sender);
    }

    function revealVoucher(uint256 _voucherId, bytes32 _publicKey) external whenNotPaused returns (string memory) {
        Voucher storage voucher = vouchers[_voucherId];
        FHE.eq(voucher.owner, FHE.asEaddress(msg.sender));
        FHE.eq(voucher.isRevealed, FHE.asEbool(false));

        voucher.isRevealed = FHE.asEbool(true);
        emit VoucherRevealed(_voucherId);

        // Seal the voucher code using the provided public key
        return FHE.sealoutput(voucher.encryptedCode, _publicKey);
    }

    function resellVoucher(uint256 _voucherId, euint32 _newPrice) external whenNotPaused {
        Voucher storage voucher = vouchers[_voucherId];
        FHE.eq(voucher.owner, FHE.asEaddress(msg.sender));
        FHE.eq(voucher.isRevealed, FHE.asEbool(false));

        voucher.price = _newPrice;
        voucher.owner = FHE.asEaddress(address(this));

        emit VoucherResold(_voucherId);
    }

    function setPlatformFee(uint32 _newFee) external onlyOwner {
        require(_newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = _newFee;
        emit PlatformFeeUpdated(_newFee);
    }

    function withdrawFunds(uint256 _amount) external onlyOwner nonReentrant {
        require(_amount <= stablecoin.balanceOf(address(this)), "Insufficient balance");
        stablecoin.safeTransfer(msg.sender, _amount);
        emit FundsWithdrawn(msg.sender, _amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 balance = stablecoin.balanceOf(address(this));
        stablecoin.safeTransfer(msg.sender, balance);
        emit FundsWithdrawn(msg.sender, balance);
    }
}