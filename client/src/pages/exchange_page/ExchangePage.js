import React, { useEffect, useState } from 'react';
import './exchange_page.scss';
import Loading from '../../components/loading/Loading';
import { Box } from '../../components/Box';
import { supportedNetworks, useConnection } from '../../connection_provider';

function ExchangePage() {
    const { connectionState, connectWallet } = useConnection();
    const { chainId, accounts, govContract, exchangeContract } = connectionState;

    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const ethToGov = 100;
    const [token1, setToken1] = useState({
        symbol: supportedNetworks[chainId].tokenSymbol,
        type: "primary",
        placeholder: 1
    });
    const [token2, setToken2] = useState({
        symbol: "GOV",
        type: "gov",
        placeholder: 100
    })

    useEffect(() => {
        if (token1.type === 'primary') {
            setToken1({ ...token1, symbol: supportedNetworks[chainId].tokenSymbol })
        } else {
            setToken2({ ...token1, symbol: supportedNetworks[chainId].tokenSymbol })
        }
    }, [chainId])

    const switchTokens = () => {
        const temp = token1;
        setToken1(token2);
        setToken2(temp);
        const ethField = document.getElementById("primary");
        const govField = document.getElementById("gov");
        const t = ethField.value;
        ethField.value = govField.value;
        govField.value = t;
    }

    const onInputChange = (event) => {
        const ethField = document.getElementById("primary");
        const govField = document.getElementById("gov");
        if (event.target.id === "primary") {
            govField.value = ethField.value * ethToGov;
        } else {
            ethField.value = govField.value / ethToGov;
        }
    }

    const handleExchange = async (e) => {
        const type = e.target.textContent;
        setError("");

        if (type === 'Buy GOV') {
            // Buy tokens
            const ethField = document.getElementById("primary").value;
            const govField = document.getElementById("gov").value;

            if (govField < 0.01) {
                setError("Minimum of 0.01 GOV has to be bought");
                return;
            }

            setLoading(true);
            try {
                await exchangeContract.methods.buy(parseInt(parseFloat(govField) * 10 ** 2)).send({ from: accounts[0], value: parseInt(parseFloat(ethField) * 10 ** 18) });
            } catch (e) {
                if (e.code === 4001) {
                    setError("Denied Metamask Transaction Signature");
                } else {
                    console.log('Error-Exchange-BuyGov', e.message)
                    setError("Smart Contract Error. See Console");
                }
            }
            setLoading(false);
        } else {
            // Sell tokens
            const govField = document.getElementById("gov").value;

            if (govField.value < 0.01) {
                setError("Minimum of 0.01 GOV has to be sold");
                return;
            }

            setLoading(true);
            try {
                await govContract.methods.approve(
                    supportedNetworks[chainId].exchangeAddress,
                    parseInt(parseFloat(govField) * 10 ** 2)
                ).send({ from: accounts[0] });

                await exchangeContract.methods.sell(parseInt(parseFloat(govField) * 10 ** 2)).send({ from: accounts[0] });
            } catch (error) {
                if (e.code === 4001) {
                    setError("Denied Metamask Transaction Signature");
                } else {
                    console.log('Error-Exchange-SellGov', error.message)
                    setError("Smart Contract Error. See Console");
                }
            }
            setLoading(false);
        }
    }

    if (isLoading) {
        return <Loading text="Please Wait" />;
    }

    return (
        <div className="container exchange-page">
            <div className="heading title">Swap</div>
            <div className="exchange-box" >
                <div className="label">From</div>
                <Box height="10" />
                <div className="textfield" data-token={token1.symbol} >
                    <input id={token1.type} onChange={onInputChange} type="number" placeholder={token1.placeholder} />
                </div>

                <Box height="15"></Box>

                <div onClick={switchTokens} className="switch-btn clickable">
                    <img height="25px" src="/mobile-data.png" alt="Swap Icon" />
                </div>

                <div className="label">To</div>
                <Box height="10" />
                <div className="textfield" data-token={token2.symbol}>
                    <input id={token2.type} onChange={onInputChange} type="number" placeholder={token2.placeholder} />
                </div>

                <Box height="30"></Box>

                <button
                    className="clickable"
                    onClick={(e) => {
                        if (accounts.length > 0) {
                            handleExchange(e)
                        } else {
                            connectWallet()
                        }
                    }}
                >
                    {accounts.length > 0 ?
                        token1.symbol === supportedNetworks[chainId].tokenSymbol ? "Buy GOV" : "Sell GOV"
                        : 'Connect Wallet'}
                </button>

                {error !== '' && <Box height="10" />}
                <p className="error">{error}</p>

                <Box height="20"></Box>

                <p className="center">Import GOV token to metamask {supportedNetworks[chainId].govAddress}</p>
            </div>
        </div>
    );
}

export default ExchangePage;