// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ICVI.sol";

/// @title MockCVI
/// @notice Test implementation of Cleanverse Verified Identity.
contract MockCVI is ICVI {
    mapping(address => bool) public identities;
    mapping(address => uint8) public levels;
    mapping(address => bool) public revoked;

    /// @notice Register a wallet as CVI-verified (for testing).
    function verify(address wallet, uint8 level) external {
        identities[wallet] = true;
        levels[wallet] = level;
        revoked[wallet] = false;
    }

    /// @notice Revoke a wallet's CVI credential (for testing).
    function revoke(address wallet) external {
        revoked[wallet] = true;
    }

    function hasIdentity(address wallet) external view returns (bool) {
        return identities[wallet] && !revoked[wallet];
    }

    function identityLevel(address wallet) external view returns (uint8) {
        return levels[wallet];
    }

    function isRevoked(address wallet) external view returns (bool) {
        return revoked[wallet];
    }
}