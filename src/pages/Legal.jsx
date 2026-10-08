import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';

const UPDATED = '8 October 2026';
const CONTACT = 'hello@city-pulse.live';

function Page({ title, children }) {
  const nav = useNavigate();
  return (
    <div className="page legal">
      <div className="ptop"><button className="back" onClick={() => (history.length > 1 ? nav(-1) : nav('/'))} aria-label="Back"><Icon name="back" /></button><h1 className="ptitle">{title}</h1></div>
      <p className="muted small">Last updated {UPDATED}</p>
      {children}
      <p className="muted small">Questions? Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. See also our <Link to={title === 'Privacy policy' ? '/terms' : '/privacy'}>{title === 'Privacy policy' ? 'terms of use' : 'privacy policy'}</Link>.</p>
    </div>
  );
}

export function Privacy() {
  return (
    <Page title="Privacy policy">
      <p>FoodTalk is a CityPulse service that lets you watch Lagos restaurants, order food and book tables. This policy explains what we collect, why, and the choices you have. We follow the Nigeria Data Protection Act 2023.</p>
      <h2>What we collect</h2>
      <ul>
        <li><b>Account details:</b> your phone number, or your name, email and profile photo if you sign in with Google.</li>
        <li><b>Orders and bookings:</b> what you order, delivery area and address, the phone number for the rider, table bookings, and payment status.</li>
        <li><b>Reports and reviews:</b> what you write when you report a problem or review a restaurant, and any photo you attach.</li>
        <li><b>Location (optional):</b> only if you tap "Near me", to show restaurants close to you.</li>
        <li><b>Device information:</b> a notification token if you turn on order alerts, and basic technical logs to keep the service running.</li>
      </ul>
      <p>We never see or store your card details. Payments are handled by Paystack.</p>
      <h2>Why we use it</h2>
      <ul>
        <li>To sign you in, take your order or booking, and send you updates about it.</li>
        <li>To let the restaurant (and its rider) prepare and deliver your food and contact you about it.</li>
        <li>To handle refunds and problem reports fairly.</li>
        <li>To prevent fraud and keep FoodTalk safe.</li>
      </ul>
      <p>We don't sell your data and we don't use it for advertising.</p>
      <h2>Who we share it with</h2>
      <ul>
        <li><b>The restaurant you order from:</b> your name, phone number, order and delivery address.</li>
        <li><b>Service providers that run FoodTalk for us:</b> Paystack (payments), Termii (login codes), Google (sign-in), Cloudinary (photos and videos), Firebase (notifications), and our hosting providers (Railway, Cloudflare). They only use your data to provide their service to us.</li>
        <li><b>Authorities</b>, when the law requires it.</li>
      </ul>
      <h2>How long we keep it</h2>
      <p>We keep your account while you use FoodTalk. Order and payment records are kept for as long as Nigerian tax and accounting rules require. When you ask us to delete your account, we delete or anonymise everything else.</p>
      <h2>Your rights</h2>
      <p>You can ask to see, correct, download or delete your data, or object to how we use it, by emailing <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We reply within 30 days. You can also complain to the Nigeria Data Protection Commission.</p>
      <h2>Children</h2>
      <p>FoodTalk is not meant for children under 13, and we don't knowingly collect their data.</p>
      <h2>Changes</h2>
      <p>If we change this policy in a way that matters, we'll tell you in the app.</p>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title="Terms of use">
      <p>These terms apply when you use FoodTalk to watch restaurants, order food or book tables. By using FoodTalk you agree to them.</p>
      <h2>What FoodTalk is</h2>
      <p>FoodTalk connects you with independent restaurants. The restaurant prepares your food, and delivers it with its own rider when you choose delivery. The restaurant is responsible for the food, its quality and allergens, and the delivery.</p>
      <h2>Prices and payment</h2>
      <ul>
        <li>You pay the menu price, any delivery fee and tax set by the restaurant, and FoodTalk's service fee. Checkout shows each part before you pay.</li>
        <li>Payment is taken by Paystack when you place the order.</li>
        <li>Table bookings carry a booking fee, shown before you pay.</li>
      </ul>
      <h2>Cancellations and refunds</h2>
      <ul>
        <li>You can cancel an order for a full refund until the restaurant accepts it.</li>
        <li>If the restaurant declines your order, you get a full refund.</li>
        <li>If something goes wrong (a missing item, the wrong order, or it never arrives), report it from the order page within 24 hours. We hear from the restaurant, then decide on a full, part or no refund.</li>
        <li>Booking fees aren't refunded if you cancel, but are refunded if the restaurant cancels.</li>
        <li>Refunds go back to the card or account you paid with and can take a few working days.</li>
      </ul>
      <h2>Your account</h2>
      <p>Keep your sign-in to yourself and give a phone number and address where you can be reached. Don't misuse FoodTalk: no fake orders, false reports, abusive reviews or attempts to get refunds you aren't owed. We may suspend accounts that do.</p>
      <h2>Reviews and content</h2>
      <p>Reviews must be honest and about your own experience. We may remove content that is false, abusive or unlawful.</p>
      <h2>Our responsibility</h2>
      <p>We work to keep FoodTalk running and accurate, but restaurants set their own menus, prices and opening times. As far as the law allows, FoodTalk isn't liable for losses caused by a restaurant, and our liability for any order is limited to what you paid for it. Nothing here limits rights you have under Nigerian consumer protection law.</p>
      <h2>Changes and law</h2>
      <p>We may update these terms and will tell you in the app when we do. These terms are governed by the laws of the Federal Republic of Nigeria.</p>
    </Page>
  );
}
