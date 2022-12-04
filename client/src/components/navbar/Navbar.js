import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supportedNetworks, useConnection } from '../../connection_provider';
import { Box } from '../Box';
import Chip from '../chip/Chip';
import './navbar.scss'

function Navbar() {
    const { connectionState, connectWallet } = useConnection();
    const { accounts, chainId } = connectionState;

    const navigate = useNavigate();

    useEffect(() => {
        // Select proper nav-option on load
        if (window.location.href.split("/").at(-1) === "") {
            document.getElementById('e').setAttribute('class', 'nav-option nav-option-c');
        } else {
            document.getElementById('g').setAttribute('class', 'nav-option nav-option-c');
        }

        // On nav-option click
        Array.from(document.getElementsByClassName('nav-option')).forEach(element => {
            element.addEventListener('click', () => {
                document.getElementsByClassName('nav-option-c')[0].setAttribute('class', 'nav-option')
                element.setAttribute('class', 'nav-option nav-option-c')
            })
        });
    }, []);

    return (
        <div>
            <nav className="no-select">
                <div className="logo">GovDAO</div>

                <div className="nav-menu">
                    <Box width="125" />

                    <div id="e" onClick={() => { navigate('/') }} className="nav-option">Exchange</div>

                    <Box width="20" />

                    <div id="g" onClick={() => { navigate('/governance') }} className="nav-option">Governance</div>
                </div>

                <div className="nav-btn-flex">
                    <Chip bgColor="var(--accent)" textColor="white" content={supportedNetworks[chainId].name} />

                    <Box width="20" />

                    {accounts.length > 0 ?
                        <Chip bgColor="var(--accent)" textColor="white" content={
                            accounts[0].substring(0, 5) + '...' + accounts[0].substring(accounts[0].length - 3, accounts[0].length)
                        } /> :
                        <Chip
                            onclick={connectWallet}
                            bgColor="var(--accent)" textColor="white"
                            content="Connect"
                        />
                    }

                </div>
            </nav>
        </div>
    );
}

export default Navbar;