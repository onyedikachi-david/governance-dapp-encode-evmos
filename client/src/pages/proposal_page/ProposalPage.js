import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Box } from '../../components/Box';
import Loading from '../../components/loading/Loading';
import { useConnection } from '../../connection_provider';
import './proposal_page.scss';

function ProposalPage() {
    const { connectionState } = useConnection();
    const { accounts, govContract } = connectionState;

    const navigate = useNavigate();

    const states = ['Live', 'Revoked', 'Passed', 'Failed']

    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState({ vote: '', buttons: '' });

    // Get Proposal Index from url
    const { index } = useParams()

    // To Store vote for or against
    const [support, setSupport] = useState(null);

    // Votes i.e. Number of Tokens to vote
    const [numberOfVotes, setNumberOfVotes] = useState(0);

    const [proposal, setProposal] = useState({
        againstVotes: "",
        announced: false,
        canceled: false,
        date: "",
        dateOfCreation: "",
        deadlineForVoting: "",
        description: "",
        forVotes: "",
        id: "",
        proposer: "",
        title: "",
        voterCount: "",
        votes: [],
        hasVoted: false,
        state: 0
    })

    // Helper to shorten address
    const shortenAddress = (addr) => {
        return `${addr.substring(0, 5)}...${addr.substring(addr.length - 3, addr.length)}`
    }

    // To check if account[0] has voted
    const checkHasVoted = (votes) => {
        for (let i = 0; i < votes.length; i++) {
            if (votes[i].voterAddress.toLowerCase() === accounts[0].toLowerCase()) {
                return true;
            }
        }
        return false;
    }

    // To check if deadline for voting is over
    const isDeadlinePassed = () => {
        return parseInt(proposal.deadlineForVoting) * 1000 < Date.now()
    }

    // To get total votes out of blockchain data
    const getTotalVotes = (blockchaindata) => {
        let totalVotesCount = 0;
        blockchaindata.forEach(function (currentObject) {
            totalVotesCount += parseInt(currentObject.votes);
        })
        return totalVotesCount;
    }

    // To filter votes raw data based on support 
    const partition = (array, isValid) => {
        return array.reduce(([pass, fail], elem) => {
            return isValid(elem) ? [[...pass, elem], fail] : [pass, [...fail, elem]];
        }, [[], []]);
    }

    // To highlight selected option and change support state
    const handleSupportChange = (e) => {
        document.querySelector('.selected') && document.querySelector('.selected').setAttribute('class', 'option');
        e.target.classList.add('selected');

        if (e.target.textContent === 'Yea') {
            setSupport(true);
        } else {
            setSupport(false);
        }
    }

    // To handle Vote
    const handleVote = async () => {
        if (support == null) {
            setError({ vote: "Please mention your support either Yea or Nay for proposal" });
            return;
        } else if (numberOfVotes === 0) {
            setError({ vote: "Please mention number of votes" });
            return;
        }
        setError({ vote: "" })
        setLoading(true);
        try {
            // Need to multiply support vote by 10^2 as decimal places is 2
            await govContract.methods.castVote(index, support, numberOfVotes * 10 ** 2).send({ from: accounts[0] });
            fetchData();
        } catch (e) {
            if (e.code === 4001) {
                setError({ vote: "Denied Metamask Transaction Signature" });
            } else {
                console.log(e)
                setError({ vote: "Smart Contract Error. See Console" });
            }
        }
        setLoading(false);
    }

    // To handle Cancel Proposal
    const handleCancelProposal = async () => {
        setError({ buttons: "" })
        setLoading(true);
        try {
            await govContract.methods.cancelProposal(index).send({ from: accounts[0] });
            fetchData()
        } catch (e) {
            if (e.code === 4001) {
                setError({ buttons: "Denied Metamask Transaction Signature" });
            } else {
                console.log(e)
                setError({ buttons: "Smart Contract Error. See Console" });
            }
        }
        setLoading(false)
    }

    // To handle Declare Result
    const handleDeclareResult = async () => {
        setError({ buttons: "" })
        setLoading(true)
        try {
            await govContract.methods.declareResult(index).send({ from: accounts[0] });
            fetchData()
        } catch (e) {
            if (e.code === 4001) {
                setError({ buttons: "Denied Metamask Transaction Signature" });
            } else {
                console.log(e)
                setError({ buttons: "Smart Contract Error. See Console" });
            }
        }
        setLoading(false);
    }

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await govContract.methods.proposals(parseInt(index)).call();
            const res = await govContract.methods.getVotes(parseInt(index)).call();
            const voted = checkHasVoted(res);
            const st = await govContract.methods.state(parseInt(index)).call();
            setProposal({
                againstVotes: response.againstVotes,
                announced: response.announced,
                canceled: response.canceled,
                date: response.date,
                dateOfCreation: response.dateOfCreation,
                deadlineForVoting: response.deadlineForVoting,
                description: response.description,
                forVotes: response.forVotes,
                id: response.id,
                proposer: response.proposer,
                title: response.title,
                voterCount: response.voterCount,
                votes: res,
                hasVoted: voted,
                state: parseInt(st)
            })
        } catch (error) {
            console.log(error.message)
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchData()
    }, [accounts, govContract]);

    const [filterForData, filterAgainstData] = partition(proposal.votes, (e) => e.support === true);

    if (isLoading) {
        return <Loading text="Please Wait" />;
    }

    return (
        <div className="proposal-page">
            <div className="back-btn" onClick={() => {
                navigate(-1);
            }}>← Back To Overview</div>
            <Box height="20" />
            <div className="p-overview hr-flex">
                <div className="p-left">
                    <p className="heading">{proposal.title}</p>
                    <Box height="10" />
                    <div className="hr-flex-start">
                        <p className="p-result"
                            style={(proposal.state === 0 || proposal.state === 2)
                                ? { '--res-color': 'var(--primary)' } : { '--res-color': 'rgba(0,0,0,0.5)' }}
                        >
                            {states[proposal.state]}
                        </p>
                        <Box width="20" />
                        <p className="p-date">{new Date(parseInt(proposal.dateOfCreation) * 1000).toLocaleString('default', { month: 'long', day: '2-digit', year: 'numeric' })}</p>

                        <Box width="20" />
                        <p className="p-date">Quorum - 30</p>
                    </div>
                </div>
                <p className="p-owner">
                    {`Creator ${shortenAddress(proposal.proposer)}`}
                </p>
            </div>

            <Box height="30" />
            {(!proposal.hasVoted && !isDeadlinePassed() && !proposal.canceled) && (
                <div>
                    <div className="options-flex">
                        <div className="option" onClick={handleSupportChange}><div>Yea</div></div>
                        <div className="option" onClick={handleSupportChange}><div>Nay</div></div>
                    </div>

                    <Box height="20" />

                    <div className="options-flex">
                        <div className="textfield">
                            <input type="number" placeholder="Number of Votes" onChange={e => setNumberOfVotes(e.target.value)} />
                        </div>

                        <button className="clickable" onClick={handleVote}>Vote</button>
                    </div>

                    {error.vote !== '' && <Box height="10" />}
                    <p className="error">{error.vote}</p>
                </div>
            )
            }

            <div className="p-grid">
                <div className="votes-card">
                    <div className="card-title">
                        <div className="hr-flex">
                            <p>For</p>
                            <p> {getTotalVotes(filterForData) / 100} votes</p>
                        </div>
                        <Box height="15" />
                        <div className="progress-bar-track">
                            <div
                                style={{ width: `${(getTotalVotes(filterForData) * 100 / (getTotalVotes(filterForData) + getTotalVotes(filterAgainstData)))}%` }}
                                className="progress-bar-thumb">
                            </div>
                        </div>
                    </div>

                    <div className="card-subtitle hr-flex">
                        <p className="subtitle"> {filterForData.length} addresses</p>
                        <p className="subtitle">votes</p>
                    </div>

                    {
                        filterForData.map(({ voterAddress, votes }, idx) => {
                            return (
                                <div key={idx} className="address-tile">
                                    <p> {voterAddress}</p>
                                    <p>{parseInt(votes) / 100} votes</p>
                                </div>
                            );
                        })
                    }
                </div>

                <div className="votes-card">
                    <div className="card-title">
                        <div className="hr-flex">
                            <p>Against</p>
                            <p> {getTotalVotes(filterAgainstData) / 100} votes</p>
                        </div>
                        <Box height="15" />
                        <div className="progress-bar-track">
                            <div
                                style={{ width: `${(getTotalVotes(filterAgainstData) * 100 / (getTotalVotes(filterForData) + getTotalVotes(filterAgainstData)))}%` }}
                                className="progress-bar-thumb">
                            </div>
                        </div>
                    </div>
                    <div className="card-subtitle hr-flex">
                        <p className="subtitle">{filterAgainstData.length} addresses</p>
                        <p className="subtitle">votes</p>
                    </div>
                    {
                        filterAgainstData.map(({ voterAddress, votes }, idx) => {
                            return (
                                <div key={idx} className="address-tile">
                                    <p> {voterAddress}</p>
                                    <p>{parseInt(votes) / 100} votes</p>
                                </div>
                            );
                        })
                    }
                </div>
            </div>

            <div className="hr-flex">
                {
                    accounts[0] && (
                        <div>
                            {
                                (!isDeadlinePassed() && proposal.proposer.toLowerCase() === accounts[0].toLowerCase() && !proposal.canceled) &&
                                <button className='clickable' onClick={handleCancelProposal}>Cancel Proposal</button>
                            }
                            {
                                (isDeadlinePassed() && !proposal.announced && !proposal.canceled && accounts[0]) &&
                                <button className='clickable' onClick={handleDeclareResult}>Declare Result</button>
                            }
                        </div>
                    )
                }
            </div>

            {error.buttons !== '' && <Box height="10" />}
            <p className="error">{error.buttons}</p>

            <Box height="30" />
            <p className="heading">Description</p>
            <Box height="20" />
            <p className='description'>{proposal.description}</p>
            <Box height="20" />
        </div>
    );
}

export default ProposalPage;

