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
        uint32 price;
        ebool isRevealed;
        eaddress owner;
        eaddress seller;
        euint64 pin;
        uint32 expiryDate;
        string imageUrl;
        string description;
    }

    struct VoucherMetaData {
        uint256 voucherId;
        uint32 price;
        uint32 expiryDate;
        string imageUrl;
        string description;
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

   function listVoucher(
        bytes memory _encryptedCode, 
        uint32 _price, 
        bytes memory _pin, 
        uint32 _expiryDate, 
        string memory _imageUrl,
        string memory _description
    ) external onlyOwner {
        require(_expiryDate == 0 || _expiryDate > block.timestamp, "Expiry date must be in the future");
        
        voucherCount++;
        vouchers[voucherCount] = Voucher({
            encryptedCode: FHE.asEuint256(_encryptedCode),
            price: _price,
            isRevealed: FHE.asEbool(false),
            owner: FHE.asEaddress(address(this)),
            seller: FHE.asEaddress(address(0)),
            pin: FHE.asEuint64(_pin),
            expiryDate: _expiryDate,
            imageUrl: _imageUrl,
            description: _description
        });

        emit VoucherListed(voucherCount);
    }

    function buyVoucher(uint256 _voucherId) external whenNotPaused nonReentrant {
        Voucher storage voucher = vouchers[_voucherId];
        FHE.req(FHE.eq(voucher.owner, FHE.asEaddress(address(this))));
        FHE.req(FHE.eq(voucher.seller, FHE.asEaddress(address(0))));
        
        // Check if the voucher has expired
        ebool hasExpired = FHE.lt(FHE.asEuint32(voucher.expiryDate), FHE.asEuint32(block.timestamp));
        ebool isNotExpired = FHE.or(FHE.eq(FHE.asEuint32(voucher.expiryDate), FHE.asEuint32(0)), FHE.not(hasExpired));
        FHE.req(isNotExpired);

        uint256 decryptedPrice = voucher.price;
        stablecoin.safeTransferFrom(msg.sender, address(this), decryptedPrice);

        voucher.owner = FHE.asEaddress(msg.sender);
        emit VoucherPurchased(_voucherId, msg.sender);
    }

    function buyResoldVoucher(uint256 _voucherId) external whenNotPaused nonReentrant {
        Voucher storage voucher = vouchers[_voucherId];
        FHE.req(FHE.eq(voucher.owner, FHE.asEaddress(address(this))));
        FHE.req(FHE.ne(voucher.seller, FHE.asEaddress(address(0))));
        
        // Check if the voucher has expired
        ebool hasExpired = FHE.lt(FHE.asEuint32(voucher.expiryDate), FHE.asEuint32(block.timestamp));
        ebool isNotExpired = FHE.or(FHE.eq(FHE.asEuint32(voucher.expiryDate), FHE.asEuint32(0)), FHE.not(hasExpired));
        FHE.req(isNotExpired);

        euint32 fee = FHE.div(FHE.mul(FHE.asEuint32(voucher.price), FHE.asEuint32(platformFee)), FHE.asEuint32(FEE_DENOMINATOR));
        euint32 sellerAmount = FHE.sub(FHE.asEuint32(voucher.price), fee);

        stablecoin.safeTransferFrom(msg.sender, address(this), voucher.price);
        stablecoin.safeTransfer(FHE.decrypt(voucher.seller), FHE.decrypt(sellerAmount));

        voucher.owner = FHE.asEaddress(msg.sender);
        voucher.seller = FHE.asEaddress(address(0)); // Reset seller after purchase

        emit VoucherPurchased(_voucherId, msg.sender);
    }

    function revealVoucher(uint256 _voucherId, bytes32 _publicKey, bytes memory _pin) external whenNotPaused returns (string memory) {
        Voucher storage voucher = vouchers[_voucherId];
        FHE.req(FHE.eq(voucher.owner, FHE.asEaddress(msg.sender)));
        FHE.req(FHE.eq(voucher.isRevealed, FHE.asEbool(false)));
        FHE.req(FHE.eq(voucher.pin, FHE.asEuint64(_pin)));
        
        // Check if the voucher has expired
        ebool hasExpired = FHE.lt(FHE.asEuint32(voucher.expiryDate), FHE.asEuint32(block.timestamp));
        ebool isNotExpired = FHE.or(FHE.eq(FHE.asEuint32(voucher.expiryDate), FHE.asEuint32(0)), FHE.not(hasExpired));
        FHE.req(isNotExpired);

        voucher.isRevealed = FHE.asEbool(true);
        emit VoucherRevealed(_voucherId);

        // Seal the voucher code using the provided public key
        return FHE.sealoutput(voucher.encryptedCode, _publicKey);
    }

      function resellVoucher(
        uint256 _voucherId, 
        uint32 _newPrice
    ) external whenNotPaused {
        Voucher storage voucher = vouchers[_voucherId];
        FHE.req(FHE.eq(voucher.owner, FHE.asEaddress(msg.sender)));
        FHE.req(FHE.eq(voucher.isRevealed, FHE.asEbool(false)));
        
        ebool hasExpired = FHE.lt(FHE.asEuint32(voucher.expiryDate), FHE.asEuint32(block.timestamp));
        ebool isNotExpired = FHE.or(FHE.eq(FHE.asEuint32(voucher.expiryDate), FHE.asEuint32(0)), FHE.not(hasExpired));
        FHE.req(isNotExpired);

        voucher.price = _newPrice;
        voucher.owner = FHE.asEaddress(address(this));
        voucher.seller = FHE.asEaddress(msg.sender);

        emit VoucherResold(_voucherId);
    }


function getVoucherMetadata(uint256 _voucherId) external view returns (VoucherMetaData memory) {
        Voucher storage voucher = vouchers[_voucherId];
        
        require(!FHE.decrypt(voucher.isRevealed), "Voucher is revealed");
        require(voucher.expiryDate == 0 || voucher.expiryDate > block.timestamp, "Voucher has expired");
        FHE.req(FHE.eq(voucher.owner, FHE.asEaddress(address(this))));

        VoucherMetaData memory metadata;
        metadata.voucherId = _voucherId;
        metadata.price = voucher.price;
        metadata.expiryDate = voucher.expiryDate;
        metadata.imageUrl = voucher.imageUrl;
        metadata.description = voucher.description;

        return metadata;
    }


function getAllVouchersMetadata() external view returns (VoucherMetaData[] memory) {
        uint256 availableCount = 0;

        
        for (uint256 i = 1; i <= voucherCount; i++) {
            Voucher storage voucher = vouchers[i];

            bool ownercheck=FHE.decrypt(FHE.eq(voucher.owner, FHE.asEaddress(address(this))));
            bool reavealcheck = FHE.decrypt(voucher.isRevealed); 
            if (!reavealcheck && (voucher.expiryDate == 0 || voucher.expiryDate > block.timestamp) && ownercheck) {
                availableCount++;
            }
        }

        VoucherMetaData[] memory allMetadata = new VoucherMetaData[](availableCount);
        uint256 index = 0;

        for (uint256 i = 1; i <= voucherCount; i++) {
            Voucher storage voucher = vouchers[i];
             bool ownercheck=FHE.decrypt(FHE.eq(voucher.owner, FHE.asEaddress(address(this))));
             bool reavealcheck = FHE.decrypt(voucher.isRevealed);
            if (!reavealcheck &&
                (voucher.expiryDate == 0 || voucher.expiryDate > block.timestamp) && ownercheck) {
                allMetadata[index] = VoucherMetaData({
                    voucherId: i,
                    price: voucher.price,
                    expiryDate: voucher.expiryDate,
                    imageUrl: voucher.imageUrl,
                    description: voucher.description
                });
                index++;
            }
        }

        return allMetadata;
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