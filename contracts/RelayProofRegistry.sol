// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract RelayProofRegistry {
    struct Receipt {
        bytes32 intentHash;
        bytes32 sourceProofHash;
        uint256 amount;
        address seller;
        uint64 expiry;
        bool accepted;
    }
    mapping(bytes32 => Receipt) public receipts;
    event ReceiptRecorded(bytes32 indexed invoiceId, bytes32 intentHash, bool accepted);

    function record(
        bytes32 invoiceId,
        bytes32 intentHash,
        bytes32 sourceProofHash,
        uint256 amount,
        address seller,
        uint64 expiry,
        bool accepted
    ) external {
        require(receipts[invoiceId].expiry == 0, "already recorded");
        require(
            invoiceId != bytes32(0) && intentHash != bytes32(0) && sourceProofHash != bytes32(0),
            "missing proof identity"
        );
        require(amount > 0 && seller != address(0), "invalid settlement");
        require(expiry > block.timestamp, "expired");
        receipts[invoiceId] = Receipt(intentHash, sourceProofHash, amount, seller, expiry, accepted);
        emit ReceiptRecorded(invoiceId, intentHash, accepted);
    }
}
