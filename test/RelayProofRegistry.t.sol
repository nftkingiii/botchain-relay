// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {RelayProofRegistry} from "../contracts/RelayProofRegistry.sol";

contract RelayProofRegistryTest {
    function testRecordStoresReceipt() external {
        RelayProofRegistry registry = new RelayProofRegistry();
        bytes32 id = keccak256("INV-2048");
        registry.record(
            id,
            keccak256("intent"),
            keccak256("approval"),
            2450,
            address(0xBEEF),
            uint64(block.timestamp + 1 days),
            true
        );
        (bytes32 intent,,,,, bool accepted) = registry.receipts(id);
        require(intent == keccak256("intent"), "intent mismatch");
        require(accepted, "not accepted");
    }
}
