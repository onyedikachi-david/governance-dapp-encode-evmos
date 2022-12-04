import React, { useEffect, useState } from 'react';
import './governance_page.scss';
import Loading from '../../components/loading/Loading';
import { Box } from '../../components/Box';
import { useNavigate } from 'react-router';
import { useConnection } from '../../connection_provider';

function GovernancePage() {
    const { connectionState } = useConnection();
    const { accounts, govContract } = connectionState;

    const [isLoading, setLoading] = useState(false);
    const stateValues = ["Live", "Revoked", "Passed", "Failed"];
    const navigate = useNavigate();

    // List of polls for home page
    const [proposalList, setProposalList] = useState([]);

    const getStatus = (state) => {
        if (state === 'Live') return 'Voting'
        if (state === 'Revoked') return 'Cancelled'
        if (state === 'Passed') return 'Accepted'
        if (state === 'Failed') return 'Rejected'
    }

    async function fetchData() {
        if (govContract != null) {
            setLoading(true);

            // Fetch number of polls
            const proposalCount = await govContract.methods.proposalCount().call();

            // Fetch all polls overview
            let tempList = [];

            for (let i = proposalCount; i > 0; i--) {
                const proposal = await govContract.methods.proposals(i).call();
                const state = await govContract.methods.state(i).call();
                proposal.index = i;
                proposal.state = stateValues[state];
                tempList.push(proposal);
            }
            setProposalList(tempList);

            setLoading(false);
        }
    }

    // On load, refresh and accounts changed Refetch
    useEffect(() => {
        fetchData();
    }, [accounts, govContract]);

    if (isLoading) {
        return <Loading text='Loading All Proposals' />;
    }

    return (
        <div className="g-page">
            <div className="hr-flex">
                <h3 className="heading">Governance Proposals</h3>
                <button className="clickable" onClick={() => { navigate('/governance/create_proposal') }}>
                    Create Proposal
                </button>
            </div>
            <div className="p-list">
                {proposalList.length === 0 ?
                    <div className='subtitle' style={{ textAlign: 'center' }}>No Proposals Created</div>
                    : <div className="subtitle">All Proposals</div>}
                {proposalList.map((proposal, idx) => (
                    <div key={idx} className="p-list-tile" onClick={() => { navigate(`/governance/proposal/${proposal.index}`) }}>
                        <div className="p-left">
                            <p className="p-title">{proposal.title}</p>
                            <Box height="10" />
                            <div className="hr-flex-start">
                                <p className="p-result" style={(proposal.state === 'Live' || proposal.state === 'Passed') ? { '--res-color': 'var(--primary)' } : { '--res-color': 'rgba(0,0,0,0.5)' }}>{proposal.state}</p>
                                <Box width="20" />
                                <p className="p-date">{new Date(parseInt(proposal.dateOfCreation) * 1000).toLocaleString('default', { month: 'long', day: '2-digit', year: 'numeric' })}</p>
                            </div>
                        </div>
                        <p className="p-status">{getStatus(proposal.state)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default GovernancePage;
