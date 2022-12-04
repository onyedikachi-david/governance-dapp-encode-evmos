import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import "./create_proposal.scss";
import { Box } from '../../components/Box';
import Loading from '../../components/loading/Loading';
import { useConnection } from '../../connection_provider';

function CreateProposal(props) {
    const { connectionState, connectWallet } = useConnection();
    const { accounts, govContract } = connectionState;

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isLoading, setLoading] = useState(false);

    // For validation errors
    const [error, setError] = useState({ title: null, description: null, button: null });

    const navigate = useNavigate();

    const handleproposal = async () => {
        let f = false;
        if (title === "") {
            setError({ title: "Please fill title" });
            f = true
        }
        if (description === "") {
            setError({ description: "Please fill description" });
            return;
        }
        if (f) return;

        setError({});
        setLoading(true);
        try {
            await govContract.methods.propose(title, description).send({ from: accounts[0] });
            navigate("/governance")
        } catch (e) {
            if (e.code === 4001) {
                setError({ button: "Denied Metamask Transaction Signature" });
            } else {
                console.log(e)
                setError({ button: "Smart Contract Error. See Console" });
            }
        }
        setLoading(false);
        setTitle("")
        setDescription("")
    };

    if (isLoading) {
        return <Loading text='Creating Proposal' />
    }

    return (
        <div className="container create-proposal">
            <div className="heading title">Create Proposal</div>
            <div className="proposal-box" >
                <label>Title</label>
                <div className="textfield" >
                    <input id="title" onChange={e => setTitle(e.target.value)} type="text" placeholder="Title of Proposal" />
                </div>
                <p className="error">{error.title}</p>

                <Box height="10"></Box>

                <label>Description</label>
                <div className="textfield">
                    <textarea id="description" onChange={(e) => setDescription(e.target.value)} rows="10" placeholder="Why should people vote on your proposal?" />
                </div>
                <p className="error">{error.description}</p>

                <Box height="20"></Box>

                <button
                    className="clickable"
                    onClick={() => {
                        if (accounts.length > 0) {
                            handleproposal()
                        } else {
                            connectWallet()
                        }
                    }}
                >
                    {accounts.length > 0 ? 'Create Proposal' : 'Connect Wallet'}
                </button>

                {error.button && <Box height="10" />}
                <p className="error">{error.button}</p>

                <Box height="20" />
                <p className="center">You need to stake 10 GOV while creating proposal.
                    If the proposal is passed by community, your stake will be returned to you</p>
            </div>
        </div>
    );
}

export default CreateProposal;
