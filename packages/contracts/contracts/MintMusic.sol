// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract MintMusic is ERC1155, Ownable, ERC2981 {
    uint256 public currentTokenId;
    
    struct Release {
        uint256 maxSupply;
        uint256 currentSupply;
        uint256 price;
        address creator;
        string uri;
    }

    mapping(uint256 => Release) public releases;

    event ReleaseCreated(uint256 indexed tokenId, address indexed creator, uint256 maxSupply, uint256 price, string uri);
    event ReleasePurchased(uint256 indexed tokenId, address indexed buyer, uint256 amount);

    constructor() ERC1155("") Ownable(msg.sender) {}

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function createRelease(
        uint256 _maxSupply,
        uint256 _price,
        string memory _uri,
        uint96 _royaltyFee
    ) public returns (uint256) {
        require(_royaltyFee <= 10000, "Royalty too high"); // 100% = 10000

        currentTokenId++;
        uint256 newItemId = currentTokenId;

        releases[newItemId] = Release({
            maxSupply: _maxSupply,
            currentSupply: 0,
            price: _price,
            creator: msg.sender,
            uri: _uri
        });

        // Set royalty for this token
        _setTokenRoyalty(newItemId, msg.sender, _royaltyFee);

        emit ReleaseCreated(newItemId, msg.sender, _maxSupply, _price, _uri);
        return newItemId;
    }

    function purchase(uint256 _id, uint256 _amount) public payable {
        Release storage release = releases[_id];
        
        require(release.creator != address(0), "Token does not exist");
        require(release.currentSupply + _amount <= release.maxSupply, "Exceeds max supply");
        require(msg.value >= release.price * _amount, "Insufficient funds");

        release.currentSupply += _amount;
        _mint(msg.sender, _id, _amount, "");

        // Transfer funds to creator
        payable(release.creator).transfer(msg.value);

        emit ReleasePurchased(_id, msg.sender, _amount);
    }

    function uri(uint256 _id) public view override returns (string memory) {
        return releases[_id].uri;
    }
}

