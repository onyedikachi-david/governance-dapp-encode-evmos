import React from 'react';
import './chip.scss'

function Chip(props) {
    return (
        <div onClick={props.onclick} className="chip-container clickable" style={{ backgroundColor: props.bgColor }} >
            <p className="chip-content no-select" style={{ color: props.textColor }}>{props.content}</p>
        </div>
    );
}

export default Chip;