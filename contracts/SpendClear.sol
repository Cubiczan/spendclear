// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/ICVI.sol";
import "./interfaces/ICVA.sol";
import "./interfaces/IERC20.sol";

/// @title SpendClear
/// @notice On-chain payment governor for autonomous agents.
///         Enforces CVI identity, CVA asset verification, spend limits,
///         and records an immutable audit trail for every payment attempt.
contract SpendClear {
    // ── Structs ──────────────────────────────────────────────

    struct Mandate {
        address agent;           // Who is authorized to spend
        address principal;       // On whose behalf (CVI-verified owner)
        uint256 totalCap;        // Lifetime cap (in token base units)
        uint256 singleMax;       // Max per-transaction limit
        uint256 spent;           // Cumulative amount spent
        bool active;             // Can be revoked by principal
    }

    struct AuditEntry {
        uint256 mandateId;
        address agent;
        address recipient;
        address token;
        uint256 amount;
        bool approved;
        string  reason;          // Empty if approved
        uint256 timestamp;
    }

    // ── State ────────────────────────────────────────────────

    ICVI public cvi;
    ICVA public cva;
    address public owner;

    uint256 public nextMandateId = 1;
    mapping(uint256 => Mandate) public mandates;

    AuditEntry[] public auditLog;

    // ── Events ───────────────────────────────────────────────

    event MandateCreated(
        uint256 indexed mandateId,
        address indexed agent,
        address indexed principal,
        uint256 totalCap,
        uint256 singleMax
    );

    event PaymentApproved(
        uint256 indexed mandateId,
        address indexed agent,
        address indexed recipient,
        address token,
        uint256 amount
    );

    event PaymentDenied(
        uint256 indexed mandateId,
        address indexed agent,
        address indexed recipient,
        address token,
        uint256 amount,
        string reason
    );

    event MandateRevoked(uint256 indexed mandateId, address indexed principal);

    // ── Modifiers ────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "SpendClear: not owner");
        _;
    }

    modifier onlyPrincipal(uint256 mandateId) {
        require(
            msg.sender == mandates[mandateId].principal,
            "SpendClear: not principal"
        );
        _;
    }

    // ── Constructor ──────────────────────────────────────────

    constructor(address _cvi, address _cva) {
        owner = msg.sender;
        cvi = ICVI(_cvi);
        cva = ICVA(_cva);
    }

    // ── Mandate Management ───────────────────────────────────

    /// @notice Create a new spending mandate. Caller becomes the principal.
    /// @param agent Address of the agent that will execute payments.
/// @param totalCap Lifetime spend cap.
    /// @param singleMax Max amount per single transaction.
    function createMandate(
        address agent,
        uint256 totalCap,
        uint256 singleMax
    ) external returns (uint256 mandateId) {
        // Principal must be CVI-verified
        require(
            cvi.hasIdentity(msg.sender),
            "SpendClear: principal not CVI-verified"
        );

        mandateId = nextMandateId++;
        mandates[mandateId] = Mandate({
            agent: agent,
            principal: msg.sender,
            totalCap: totalCap,
            singleMax: singleMax,
            spent: 0,
            active: true
        });

        emit MandateCreated(mandateId, agent, msg.sender, totalCap, singleMax);
    }

    /// @notice Revoke a mandate. Only the principal can do this.
    function revokeMandate(uint256 mandateId) external onlyPrincipal(mandateId) {
        mandates[mandateId].active = false;
        emit MandateRevoked(mandateId, msg.sender);
    }

    // ── Payment Execution ────────────────────────────────────

    /// @notice Execute a payment through the governor.
    ///         Enforces: CVI identity, CVA asset verification, spend limits.
    /// @param mandateId The mandate authorizing this spend.
    /// @param token ERC20 token address (must be CVA-verified).
    /// @param recipient Destination wallet (must be CVI-verified).
    /// @param amount Amount to transfer.
    function executePayment(
        uint256 mandateId,
        address token,
        address recipient,
        uint256 amount
    ) external {
        Mandate storage m = mandates[mandateId];

        // Gate 0: caller must be the authorized agent
        require(msg.sender == m.agent, "SpendClear: not authorized agent");

        // Gate 1: mandate must be active
        require(m.active, "SpendClear: mandate revoked");

        // Gate 2: CVI identity — recipient must be verified
        if (!cvi.hasIdentity(recipient)) {
            _deny(mandateId, recipient, token, amount, "CVI: recipient not verified");
            return;
        }

        // Gate 3: CVA asset — token must be verified clean
        if (!cva.isVerified(token)) {
            _deny(mandateId, recipient, token, amount, "CVA: token not verified");
            return;
        }

        // Gate 4: CVA compliance — amount must pass screening
        if (!cva.isClean(token, amount)) {
            _deny(mandateId, recipient, token, amount, "CVA: amount flagged");
            return;
        }

        // Gate 5: single-transaction limit
        if (amount > m.singleMax) {
            _deny(mandateId, recipient, token, amount, "exceeds single-transaction max");
            return;
        }

        // Gate 6: cumulative spend cap
        if (m.spent + amount > m.totalCap) {
            _deny(mandateId, recipient, token, amount, "exceeds mandate total cap");
            return;
        }

        // All gates passed — execute transfer
        m.spent += amount;

        require(
            IERC20(token).transferFrom(m.principal, recipient, amount),
            "SpendClear: transfer failed"
        );

        auditLog.push(AuditEntry({
            mandateId: mandateId,
            agent: msg.sender,
            recipient: recipient,
            token: token,
            amount: amount,
            approved: true,
            reason: "",
            timestamp: block.timestamp
        }));

        emit PaymentApproved(mandateId, msg.sender, recipient, token, amount);
    }

    // ── Internal ─────────────────────────────────────────────

    function _deny(
        uint256 mandateId,
        address recipient,
        address token,
        uint256 amount,
        string memory reason
    ) internal {
        auditLog.push(AuditEntry({
            mandateId: mandateId,
            agent: msg.sender,
            recipient: recipient,
            token: token,
            amount: amount,
            approved: false,
            reason: reason,
            timestamp: block.timestamp
        }));

        emit PaymentDenied(mandateId, msg.sender, recipient, token, amount, reason);
    }

    // ── View Functions ───────────────────────────────────────

    /// @notice Get the full audit log length.
    function auditLogLength() external view returns (uint256) {
        return auditLog.length;
    }

    /// @notice Get remaining capacity on a mandate.
    function remainingCapacity(uint256 mandateId)
        external
        view
        returns (uint256)
    {
        Mandate storage m = mandates[mandateId];
        return m.totalCap - m.spent;
    }

    /// @notice Get paginated audit entries.
    function getAuditEntries(uint256 offset, uint256 limit)
        external
        view
        returns (AuditEntry[] memory)
    {
        uint256 end = offset + limit;
        if (end > auditLog.length) end = auditLog.length;
        uint256 count = end - offset;

        AuditEntry[] memory entries = new AuditEntry[](count);
        for (uint256 i = 0; i < count; i++) {
            entries[i] = auditLog[offset + i];
        }
        return entries;
    }
}
