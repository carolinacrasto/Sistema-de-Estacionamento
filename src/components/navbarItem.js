import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function NavbarItem({ render, ...props }) {
  const location = useLocation();

  if (!render) {
    return null;
  }

  const isActive = location.pathname === props.href;

  return (
    <li className='nav-item'>
      <Link
        to={props.href}
        onClick={props.onClick}
        className={`nav-link ${isActive ? 'active fw-semibold' : ''}`}
      >
        {props.label}
      </Link>
    </li>
  );
}

export default NavbarItem;