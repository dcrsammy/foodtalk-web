import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useCart, cartCount } from '../lib/cart.js';

export default function BottomNav({ dark }) {
  const n = cartCount(useCart());
  const L = (to, icon, label, extra) => (
    <NavLink to={to} end className={({ isActive }) => (isActive ? 'on' : '')}>
      <span className="ico"><Icon name={icon} />{extra}</span><span>{label}</span>
    </NavLink>
  );
  return (
    <nav className={'bnav' + (dark ? ' dark' : '')} aria-label="Main">
      {L('/', 'home', 'Feed')}
      {L('/search', 'search', 'Search')}
      {L('/checkout', 'bag', 'Cart', n ? <b className="dotn">{n}</b> : null)}
      {L('/me', 'user', 'Me')}
    </nav>
  );
}
