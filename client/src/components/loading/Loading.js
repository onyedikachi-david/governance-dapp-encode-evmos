import React from 'react';
import { Box } from '../Box';
import './loading.scss'

function Loading({ text }) {
    return (
        <>
            <div className="loading-container">
                <div className="load load1"></div>
                <Box width="20" />
                <div className="load load2"></div>
                <Box width="20" />
                <div className="load load3"></div>
            </div>
            <div className="loading-container loading-text">{text}</div>
        </>
    );
}

export default Loading;