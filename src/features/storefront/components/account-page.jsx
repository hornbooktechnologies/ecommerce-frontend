'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, MapPin, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import StoreHeader from './store-header';
import styles from './account-page.module.css';

const headings = { login: 'Welcome back.', register: 'A little more personal.', 'forgot-password': 'Let’s get you back in.', 'reset-password': 'Choose a new password.', verify: 'Your account starts here.', profile: 'Your Hornbook account.' };
const descriptions = { login: 'Sign in to manage your profile and delivery addresses.', register: 'We’ll email you a link to verify your address and securely create your password.', 'forgot-password': 'Enter your account email. We’ll send a single-use password reset link.', 'reset-password': 'Use a unique password of 12–128 characters.', verify: 'Confirm your email by creating a unique password of 12–128 characters.', profile: 'Your details, your addresses. Ready for your next visit.' };
const emptyAddress = { label: '', contactName: '', phone: '', line1: '', line2: '', landmark: '', city: '', stateCode: '', postalCode: '', isDefault: false };
const subscribeHash = (callback) => { window.addEventListener('hashchange', callback); return () => window.removeEventListener('hashchange', callback); };
const readToken = () => new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
async function api(path, method = 'GET', body) {
  const response = await fetch(`/api/customer/${path}`, { method, credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, ...(method !== 'GET' ? { body: JSON.stringify(body || {}) } : {}) });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error?.message || 'Please try again.'), { status: response.status, details: result.error?.details || [] });
  if (['login', 'logout', 'password', 'reset-password', 'profile'].includes(path)) window.dispatchEvent(new Event('customer-account-changed'));
  return result.data;
}

export default function AccountPage({ mode }) {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', newPassword: '', confirmPassword: '' });
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState({ firstName: '', lastName: '', phone: '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [address, setAddress] = useState(null);
  const token = useSyncExternalStore(subscribeHash, readToken, () => '');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(mode === 'profile');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorGroup, setErrorGroup] = useState('auth');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reload, setReload] = useState(0);
  const errorRef = useRef(null);
  const addressRef = useRef(null);
  const addressOpen = Boolean(address);
  useEffect(() => {
    if (mode !== 'profile') return;
    let cancelled = false;
    api('me').then((result) => { if (!cancelled) { setData(result); setProfile(result.customer); } })
      .catch((failure) => { if (!cancelled) { if (failure.status === 401) router.replace('/account/login'); else setError(failure.message); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mode, router, reload]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => { if (addressOpen) addressRef.current?.focus(); }, [addressOpen]);

  function failure(cause) {
    setError(cause.message || 'Unable to connect. Please try again.');
    setFieldErrors(Object.fromEntries((cause.details || []).map((item) => [item.field, item.message])));
    toast.error(cause.message || 'Please try again.');
    if (cause.status === 401 && mode === 'profile') { setData(null); router.replace('/account/login'); }
  }
  async function run(key, operation) {
    setBusy(key); setErrorGroup(key); setError(''); setFieldErrors({}); setMessage('');
    try { await operation(); } catch (cause) { failure(cause); } finally { setBusy(''); }
  }
  function confirm(value) {
    if (value.newPassword !== value.confirmPassword) throw Object.assign(new Error('The passwords do not match.'), { details: [{ field: 'confirmPassword', message: 'Enter the same password again.' }] });
  }
  async function submit(event) {
    event.preventDefault();
    await run('auth', async () => {
      let result;
      if (mode === 'login') { await api('login', 'POST', { email: form.email, password: form.password }); toast.success('Welcome back.'); router.replace('/account'); router.refresh(); return; }
      if (mode === 'register') result = await api('register', 'POST', { email: form.email, firstName: form.firstName, lastName: form.lastName });
      else if (mode === 'forgot-password') result = await api('forgot-password', 'POST', { email: form.email });
      else {
        confirm(form);
        result = await api(mode, 'POST', { token, newPassword: form.newPassword });
        window.history.replaceState(null, '', window.location.pathname);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        setForm((current) => ({ ...current, newPassword: '', confirmPassword: '' }));
      }
      setMessage(result.message); toast.success(result.message);
    });
  }
  function field(model, setter, name, label, options = {}) {
    const prefix = model === password ? 'password' : model === profile ? 'profile' : model === address ? 'address' : 'auth';
    const id = `${prefix}-${name}`;
    const isPassword = options.type === 'password';
    return <div className={styles.field}><label htmlFor={id}>{label}{options.required && <span aria-hidden="true"> *</span>}</label><span className={styles.inputWrap}>
      <input id={id} name={name} value={model[name] || ''} onChange={(event) => setter((current) => ({ ...current, [name]: event.target.value }))} {...options}
        type={isPassword && showPassword ? 'text' : options.type || 'text'} aria-invalid={Boolean(fieldErrors[name])} aria-describedby={fieldErrors[name] ? `${id}-error` : undefined} />
      {isPassword && <button className={styles.reveal} type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>}
    </span>{fieldErrors[name] && <small id={`${id}-error`} className={styles.fieldError}>{fieldErrors[name]}</small>}</div>;
  }
  const disabled = Boolean(busy);
  return <><StoreHeader /><main className={styles.page}>
    <Link className={styles.back} href="/"><ArrowLeft size={16} />Back to shopping</Link>
    {mode === 'profile' && <div className={styles.links}><Link href="/account/orders">My orders <ArrowRight size={16} aria-hidden="true" /></Link></div>}
    <div className={styles.heading}><span className={styles.eyebrow}>THE HORNBOOK ACCOUNT</span><h1>{headings[mode]}</h1><p>{descriptions[mode]}</p></div>
    {error && <div ref={errorRef} tabIndex={-1} role="alert" className={styles.error}><strong>{error}</strong>{Object.entries(fieldErrors).map(([name, text]) => <p key={name}><a href={`#${errorGroup}-${name}`} onClick={() => document.getElementById(`${errorGroup}-${name}`)?.focus()}>{text}</a></p>)}{mode === 'profile' && !data && <button onClick={() => { setLoading(true); setReload((value) => value + 1); }}>Try again</button>}</div>}
    {message && <div className={styles.success} role="status"><ShieldCheck size={20} /><span>{message}</span></div>}
    {mode !== 'profile' ? <div className={styles.authGrid}>
      <section className={styles.card} aria-label="Customer account form">
        <form onSubmit={submit}><fieldset disabled={disabled}>
          {mode === 'register' && <div className={styles.two}>{field(form, setForm, 'firstName', 'First name', { required: true, autoComplete: 'given-name', maxLength: 100 })}{field(form, setForm, 'lastName', 'Last name', { autoComplete: 'family-name', maxLength: 100 })}</div>}
          {['login', 'register', 'forgot-password'].includes(mode) && field(form, setForm, 'email', 'Email address', { type: 'email', required: true, autoComplete: 'email', maxLength: 254 })}
          {mode === 'login' && field(form, setForm, 'password', 'Password', { type: 'password', required: true, autoComplete: 'current-password', maxLength: 128 })}
          {['verify', 'reset-password'].includes(mode) && <>{field(form, setForm, 'newPassword', 'New password', { type: 'password', required: true, minLength: 12, maxLength: 128, autoComplete: 'new-password' })}{field(form, setForm, 'confirmPassword', 'Confirm password', { type: 'password', required: true, minLength: 12, maxLength: 128, autoComplete: 'new-password' })}<small>12–128 characters. Password managers and pasted passwords are supported.</small>{!token && !message && <p className={styles.fieldError}>Open the link from your email to continue.</p>}</>}
          <button className={styles.primary} disabled={disabled || (['verify', 'reset-password'].includes(mode) && !token)}>{disabled ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Send verification link' : mode === 'forgot-password' ? 'Send reset link' : mode === 'verify' ? 'Verify and create account' : 'Reset password'}<ArrowRight size={18} /></button>
        </fieldset></form>
        <div className={styles.links}>{mode !== 'login' && <Link href="/account/login">Back to sign in</Link>}{mode === 'login' && <><Link href="/account/forgot-password">Forgot password?</Link><Link href="/account/register">Create an account</Link></>}{mode === 'verify' && <Link href="/account/register">Request a new verification link</Link>}{mode === 'reset-password' && <Link href="/account/forgot-password">Request a new reset link</Link>}</div>
      </section>
      <aside className={styles.aside}><ShieldCheck size={32} aria-hidden="true" /><h2>Made for your everyday.</h2><p>Keep your details and delivery addresses together in one place.</p><ul><li><Mail size={19} />Verified email, private account</li><li><MapPin size={19} />Saved addresses across your devices</li><li><LockKeyhole size={19} />Secure sign-in, separate from store staff</li></ul><small>Shopping as a guest? You can still explore the full catalog.</small></aside>
    </div> : loading ? <section className={styles.card} role="status">Loading your account…</section> : data && <>
      <div className={styles.accountBar}><span><strong>{data.customer.firstName} {data.customer.lastName}</strong><small>{data.customer.email} · Verified email</small></span><button disabled={disabled} onClick={() => run('logout', async () => { await api('logout', 'POST'); setData(null); toast.success('Signed out.'); router.replace('/account/login'); router.refresh(); })}>Sign out</button></div>
      <div className={styles.accountGrid}><section className={styles.card}><h2>Personal details</h2><p>Your verified email is fixed for account security.</p><form onSubmit={(event) => { event.preventDefault(); run('profile', async () => { const result = await api('profile', 'PUT', { firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone }); setData(result); toast.success('Profile saved.'); }); }}><fieldset disabled={disabled}>
        <div className={styles.two}>{field(profile, setProfile, 'firstName', 'First name', { required: true, autoComplete: 'given-name', maxLength: 100 })}{field(profile, setProfile, 'lastName', 'Last name', { autoComplete: 'family-name', maxLength: 100 })}</div>
        {field(profile, setProfile, 'phone', 'Phone number', { type: 'tel', autoComplete: 'tel', maxLength: 20 })}<button className={styles.primary}>{busy === 'profile' ? 'Saving…' : 'Save details'}</button>
      </fieldset></form></section>
      <section className={styles.card}><h2>Password & security</h2><p>Changing your password signs out all customer sessions.</p><form onSubmit={(event) => { event.preventDefault(); run('password', async () => { confirm(password); const result = await api('password', 'POST', { currentPassword: password.currentPassword, newPassword: password.newPassword }); toast.success(result.message); setData(null); router.replace('/account/login'); }); }}><fieldset disabled={disabled}>
        {field(password, setPassword, 'currentPassword', 'Current password', { type: 'password', required: true, autoComplete: 'current-password', maxLength: 128 })}
        {field(password, setPassword, 'newPassword', 'New password', { type: 'password', required: true, minLength: 12, maxLength: 128, autoComplete: 'new-password' })}
        {field(password, setPassword, 'confirmPassword', 'Confirm password', { type: 'password', required: true, minLength: 12, maxLength: 128, autoComplete: 'new-password' })}<button className={styles.primary}>{busy === 'password' ? 'Changing…' : 'Change password'}</button>
      </fieldset></form></section></div>
      <section className={styles.card}><div className={styles.sectionHeading}><div><h2>Delivery addresses</h2><p>India · Up to 20 saved addresses</p></div><button disabled={disabled} onClick={() => { setFieldErrors({}); setAddress({ ...emptyAddress, contactName: `${data.customer.firstName} ${data.customer.lastName}`.trim(), phone: data.customer.phone }); }}><Plus size={18} />Add address</button></div>
        {!data.addresses.length && <p>No addresses saved yet. Add your first delivery address.</p>}
        <div className={styles.addresses}>{data.addresses.map((item) => <article key={item.id}><div className={styles.sectionHeading}><strong>{item.label || 'Delivery address'}</strong>{item.isDefault && <span className={styles.badge}>Default</span>}</div><p>{item.contactName}<br />{item.line1}{item.line2 && <>, {item.line2}</>}<br />{item.city}, {item.stateName} – {item.postalCode}<br />{item.phone}</p><div className={styles.addressActions}><button disabled={disabled} onClick={() => { setFieldErrors({}); setAddress({ ...item }); }}><Pencil size={16} />Edit</button><button className={styles.danger} disabled={disabled} onClick={() => { if (window.confirm('Remove this saved delivery address?')) run('address', async () => { setData(await api(`addresses/${item.id}`, 'DELETE')); if (address?.id === item.id) setAddress(null); toast.success('Address removed.'); }); }}><Trash2 size={16} />Delete</button></div></article>)}</div>
        {address && <form className={styles.addressForm} onSubmit={(event) => { event.preventDefault(); run('address', async () => {
          const input = Object.fromEntries(Object.keys(emptyAddress).map((key) => [key, address[key]]));
          setData(await api(address.id ? `addresses/${address.id}` : 'addresses', address.id ? 'PUT' : 'POST', input)); setAddress(null); toast.success('Address saved.');
        }); }}><h3 ref={addressRef} tabIndex={-1}>{address.id ? 'Edit address' : 'New address'}</h3><fieldset disabled={disabled}>
          <div className={styles.two}>{field(address, setAddress, 'label', 'Address label', { maxLength: 80, placeholder: 'Home or work' })}{field(address, setAddress, 'contactName', 'Recipient name', { required: true, autoComplete: 'shipping name', maxLength: 100 })}</div>
          {field(address, setAddress, 'line1', 'Address line 1', { required: true, minLength: 3, maxLength: 255, autoComplete: 'shipping address-line1' })}{field(address, setAddress, 'line2', 'Address line 2', { maxLength: 255, autoComplete: 'shipping address-line2' })}
          <div className={styles.two}>{field(address, setAddress, 'landmark', 'Landmark', { maxLength: 190 })}{field(address, setAddress, 'city', 'City', { required: true, minLength: 2, maxLength: 120, autoComplete: 'shipping address-level2' })}
          <label className={styles.field}><span>State / union territory *</span><select required value={address.stateCode} onChange={(event) => setAddress((current) => ({ ...current, stateCode: event.target.value }))}><option value="">Select state</option>{Object.entries(data.states).map(([code, name]) => <option value={code} key={code}>{name}</option>)}</select>{fieldErrors.stateCode && <small className={styles.fieldError}>{fieldErrors.stateCode}</small>}</label></div>
          <div className={styles.two}>{field(address, setAddress, 'postalCode', 'PIN code', { required: true, pattern: '[1-9][0-9]{5}', inputMode: 'numeric', maxLength: 6, autoComplete: 'shipping postal-code' })}{field(address, setAddress, 'phone', 'Delivery phone', { type: 'tel', maxLength: 20, autoComplete: 'shipping tel' })}</div>
          <label className={styles.check}><input type="checkbox" checked={address.isDefault} onChange={(event) => setAddress((current) => ({ ...current, isDefault: event.target.checked }))} />Use as default delivery address</label>
          <div className={styles.addressActions}><button type="button" onClick={() => setAddress(null)}>Cancel</button><button className={styles.primary}>{busy === 'address' ? 'Saving…' : 'Save address'}</button></div>
        </fieldset></form>}
      </section>
    </>}
  </main></>;
}
