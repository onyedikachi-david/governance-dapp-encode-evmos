// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./Exchange.sol";

interface IERC20 {
    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    //     event Transfer(address indexed from, address indexed to, uint256 value);
    //     event Approval(address indexed owner, address indexed spender, uint256 value);
    //
}

contract GovToken is IERC20 {
    string public constant name = "GOVToken";
    string public constant symbol = "GOV";
    uint8 public constant decimals = 2;

    event Approval(
        address indexed tokenOwner,
        address indexed spender,
        uint256 tokens
    );
    event Transfer(address indexed from, address indexed to, uint256 tokens);

    mapping(address => uint256) balances;
    mapping(address => uint256) locked;

    mapping(address => mapping(address => uint256)) allowed;

    uint256 _totalSupply = 100000;
    address public creator;
    address public exchangeAddress;

    using SafeMath for uint256;

    constructor() {
        balances[msg.sender] = (_totalSupply * 20) / 100;
        balances[address(this)] = (_totalSupply * 40) / 100;
        exchangeAddress = address(new Exchange(address(this), 100000000000000)); // price is 0.0001 eth i.e. 1eth = 10000 tokens
        balances[exchangeAddress] = (_totalSupply * 40) / 100;
        creator = msg.sender;
    }

    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator can call this function");
        _;
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address tokenOwner)
        public
        view
        override
        returns (uint256)
    {
        return balances[tokenOwner];
    }

    function lockedOf(address tokenOwner) public view returns (uint256) {
        return locked[tokenOwner];
    }

    function transfer(address receiver, uint256 numTokens)
        public
        override
        returns (bool)
    {
        require(
            numTokens <= balances[msg.sender] - locked[msg.sender],
            "Governance::transfer:Insufficient tokens"
        );
        balances[msg.sender] = balances[msg.sender].sub(numTokens);
        balances[receiver] = balances[receiver].add(numTokens);
        emit Transfer(msg.sender, receiver, numTokens);
        return true;
    }

    function transferFromContract(address receiver, uint256 numTokens)
        internal
        returns (bool)
    {
        require(
            numTokens <= balances[address(this)],
            "Governance::transferFromContract:Insufficient tokens"
        );
        balances[address(this)] = balances[address(this)].sub(numTokens);
        balances[receiver] = balances[receiver].add(numTokens);
        emit Transfer(address(this), receiver, numTokens);
        return true;
    }

    function approve(address delegate, uint256 numTokens)
        public
        override
        returns (bool)
    {
        allowed[msg.sender][delegate] = numTokens;
        emit Approval(msg.sender, delegate, numTokens);
        return true;
    }

    function allowance(address owner, address delegate)
        public
        view
        override
        returns (uint256)
    {
        return allowed[owner][delegate];
    }

    function transferFrom(
        address owner,
        address receiver,
        uint256 numTokens
    ) public override returns (bool) {
        require(
            numTokens <= allowed[owner][msg.sender],
            "Governance::transferFrom:Not Allowed"
        );
        require(
            numTokens <= balances[owner] - locked[owner],
            "Governance::transferFrom:Insufficient tokens"
        );

        balances[owner] = balances[owner].sub(numTokens);
        allowed[owner][msg.sender] = allowed[owner][msg.sender].sub(numTokens);
        balances[receiver] = balances[receiver].add(numTokens);
        emit Transfer(owner, receiver, numTokens);
        return true;
    }

    function mint(uint256 numTokens) public onlyCreator {
        require(
            msg.sender != address(0),
            "Governance::mint: mint to the zero address"
        );
        _totalSupply += numTokens;
        balances[msg.sender] += numTokens;
        emit Transfer(address(0), msg.sender, numTokens);
    }

    function burn(uint256 numTokens) public {
        require(
            msg.sender != address(0),
            "Governance::burn: burn from the zero address"
        );
        require(
            balances[msg.sender] - locked[msg.sender] >= numTokens,
            "Governance::burn: burn amount exceeds balance"
        );
        balances[msg.sender] -= numTokens;
        _totalSupply -= numTokens;

        emit Transfer(msg.sender, address(0), numTokens);
    }

    uint256 public proposalCount;
    uint256 tokensReqdForProposal = 1000;
    uint256 declaringResultReward = 500;

    function quorumVotes() public pure returns (uint256) {
        return 30;
    }

    /// @notice The total number of proposals
    struct Proposal {
        //  Unique id for looking up a proposal
        uint256 id;
        //  Creator of the proposal
        address proposer;
        //  Current number of votes in favor of this proposal
        uint256 forVotes;
        //  Current number of votes in opposition to this proposal
        uint256 againstVotes;
        //  Flag marking whether the proposal has been canceled
        bool canceled;
        //  Flag marking whether the proposal has been announced
        bool announced;
        uint256 voterCount;
        // description  of the proposal
        string description;
        //title  of the proposal
        string title;
        //creation date
        uint256 dateOfCreation;
        //cancellation date or announcement date
        uint256 date;
        // Deadln=ine for voting
        uint256 deadlineForVoting;
    }
    /// @notice Ballot receipt record for a voter
    struct Receipt {
        //  Hether or not a vote has been cast
        bool hasVoted;
        //  Whether or not the voter supports the proposal
        bool support;
        //  The number of votes the voter had, which were cast
        uint256 votes;
    }

    // The official record of all proposals ever proposed
    mapping(uint256 => Proposal) public proposals;

    // To store receipts of all voters on all proposals
    // proposalId => (voterAddress => Receipt)
    mapping(uint256 => mapping(address => Receipt)) receipts;

    // To store all voters on all proposals
    // proposalId => (voterIndex => voterAddress)
    mapping(uint256 => mapping(uint256 => address)) voters;

    /// @notice Possible states that a proposal may be in
    enum ProposalState {
        Active,
        Canceled,
        Accepted,
        Rejected
    }

    /// @notice An event emitted when a new proposal is created
    event ProposalCreated(
        uint256 id,
        address proposer,
        string description,
        string title,
        uint256 dateOfCreation
    );

    /// @notice An event emitted when a vote has been cast on a proposal
    event VoteCast(
        address voter,
        uint256 proposalId,
        bool support,
        uint256 votes
    );

    function propose(string memory title, string memory description) external {
        require(
            balances[msg.sender] - locked[msg.sender] >= tokensReqdForProposal,
            "Governance::propose: User doesn't have sufficient token to create a new proposal"
        );
        bool sent = transfer(address(this), tokensReqdForProposal);
        require(sent, "Governance::propose: Failure in transferring tokens");

        if (proposalCount != 0) {
            ProposalState latestProposalState = state(proposalCount);
            require(
                latestProposalState != ProposalState.Active,
                "Governance::propose: one live proposal at a time, found an already active proposal"
            );
        }

        proposalCount++;
        Proposal memory newProposal = Proposal({
            id: proposalCount,
            proposer: msg.sender,
            description: description,
            forVotes: 0,
            againstVotes: 0,
            canceled: false,
            announced: false,
            deadlineForVoting: block.timestamp + 2 minutes,
            voterCount: 0,
            title: title,
            dateOfCreation: block.timestamp,
            date: block.timestamp
        });

        proposals[newProposal.id] = newProposal;
        emit ProposalCreated(
            newProposal.id,
            msg.sender,
            description,
            title,
            newProposal.dateOfCreation
        );
    }

    function getReceipt(uint256 proposalId, address voter)
        external
        view
        returns (Receipt memory)
    {
        return receipts[proposalId][voter];
    }

    function state(uint256 proposalId) public view returns (ProposalState) {
        require(
            proposalCount >= proposalId && proposalId > 0,
            "Governance::state: invalid proposal id"
        );
        Proposal storage proposal = proposals[proposalId];
        if (proposal.canceled) {
            return ProposalState.Canceled;
        } else if (proposal.announced) {
            if (
                proposal.forVotes > proposal.againstVotes &&
                proposal.forVotes > quorumVotes()
            ) {
                return ProposalState.Accepted;
            } else {
                return ProposalState.Rejected;
            }
        } else {
            return ProposalState.Active;
        }
    }

    function castVote(
        uint256 proposalId,
        bool support,
        uint256 votes
    ) external {
        require(
            proposalCount >= proposalId && proposalId > 0,
            "Governance::castVote: invalid proposal id"
        );
        Proposal storage proposal = proposals[proposalId];
        require(
            block.timestamp <= proposal.deadlineForVoting,
            "Governance::castVote: Voting period has ended"
        );
        require(
            balances[msg.sender] - locked[msg.sender] >= votes,
            "Governance::castVote: User doesn't have sufficient token to vote"
        );
        Receipt storage receipt = receipts[proposalId][msg.sender];
        require(
            (receipt.hasVoted == false || receipt.support == support),
            "Governance::castVote: You can't cast vote to both outcome"
        );

        if (receipt.hasVoted == true) {
            receipt.votes = receipt.votes + votes;
        } else {
            receipt.hasVoted = true;
            receipt.support = support;
            receipt.votes = votes;
            voters[proposalId][proposal.voterCount] = msg.sender;
            proposal.voterCount++;
        }
        if (support) {
            proposal.forVotes = proposal.forVotes.add(votes);
        } else {
            proposal.againstVotes = proposal.againstVotes.add(votes);
        }

        locked[msg.sender] += votes;
        receipts[proposalId][msg.sender] = receipt;
        emit VoteCast(msg.sender, proposalId, support, votes);
    }

    function declareResult(uint256 proposalId) external {
        require(
            proposalCount >= proposalId && proposalId > 0,
            "Governance::declareResult: invalid proposal id"
        );
        Proposal storage proposal = proposals[proposalId];
        require(
            block.timestamp > proposal.deadlineForVoting,
            "Governance::declareResult: Voting period has not yet ended"
        );
        ProposalState _ProposalState = state(proposalId);
        require(
            _ProposalState != ProposalState.Canceled,
            "Governance::declareResult: Prososal is canceled"
        );
        require(
            _ProposalState != ProposalState.Accepted &&
                _ProposalState != ProposalState.Rejected,
            "Governance::declareResult: Result already announced"
        );

        for (uint256 i = 0; i < proposal.voterCount; i++) {
            Receipt storage receipt = receipts[proposalId][
                voters[proposalId][i]
            ];
            locked[voters[proposalId][i]] -= receipt.votes;
        }
        proposal.announced = true;
        transferFromContract(msg.sender, declaringResultReward);
        if (
            proposal.forVotes > proposal.againstVotes &&
            proposal.forVotes > quorumVotes()
        ) {
            //winning
            transferFromContract(proposal.proposer, tokensReqdForProposal);
        }
    }

    function cancelProposal(uint256 proposalId) external {
        require(
            proposalCount >= proposalId && proposalId > 0,
            "Governance::cancelProposal: invalid proposal id"
        );
        Proposal storage proposal = proposals[proposalId];
        require(
            msg.sender == proposal.proposer,
            "Governance::cancelProposal: only creator can cancel the proposal"
        );
        require(
            block.timestamp < proposal.deadlineForVoting,
            "Governance::cancelProposal: Proposal cannot be Canceled after voting time"
        );
        ProposalState _ProposalState = state(proposalId);
        require(
            _ProposalState != ProposalState.Canceled,
            "Governance::declareResult: Prososal is already canceled"
        );
        proposal.canceled = true;
        for (uint256 i = 0; i < proposal.voterCount; i++) {
            Receipt storage receipt = receipts[proposalId][
                voters[proposalId][i]
            ];
            locked[voters[proposalId][i]] -= receipt.votes;
        }
    }

    struct Vote {
        address voterAddress;
        bool support;
        uint256 votes;
    }

    function getVotes(uint256 proposalId) public view returns (Vote[] memory) {
        uint256 voterCount = proposals[proposalId].voterCount;
        Vote[] memory votes = new Vote[](voterCount);
        for (uint256 i = 0; i < voterCount; i++) {
            votes[i] = Vote(
                voters[proposalId][i],
                receipts[proposalId][voters[proposalId][i]].support,
                receipts[proposalId][voters[proposalId][i]].votes
            );
        }
        return votes;
    }
}

library SafeMath {
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        assert(b <= a);
        return a - b;
    }

    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        assert(c >= a);
        return c;
    }
}
