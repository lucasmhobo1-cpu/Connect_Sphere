import { useEffect, useMemo, useState, type ComponentProps, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, Show, SignIn, SignUp, UserProfile, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ArrowDownRight, ArrowLeft, ArrowRight, AudioLines, ChevronDown, CircleHelp, Menu, Music2, Search, ShoppingBag, X } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  useCreateAdminProduct, useCreateSupportRequest, useGetAccountOverview, useGetArticle, useGetProduct,
  useListAdminProducts, useUpdateAdminProduct,
  useListArticles, useListProducts, useListReleases, useSubscribeNewsletter,
  getListProductsQueryKey, getGetProductQueryKey, getListArticlesQueryKey,
  getGetArticleQueryKey, getListReleasesQueryKey, getGetAccountOverviewQueryKey,
  getListAdminProductsQueryKey,
  type AdminProduct, type AdminProductInput, type Product, type Article, type Release,
} from '@workspace/api-client-react';
import { BrowserRouter, Link as RouterLink, Navigate, Route, Routes, useLocation as useRouterLocation, useNavigate, useParams } from 'react-router-dom';

type SphereLinkProps = Omit<ComponentProps<typeof RouterLink>, 'to'> & { href: string };
function Link({ href, ...props }: SphereLinkProps) { return <RouterLink to={href} {...props}/>; }
const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
function stripBase(path: string) { return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path; }
if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');

const appearance = {
  theme: shadcn, cssLayerName: 'clerk',
  options: { logoPlacement: 'inside' as const, logoLinkUrl: basePath || '/', logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
  variables: { colorPrimary: '#d8a83d', colorForeground: '#f4f0e8', colorMutedForeground: '#b1aa9d', colorDanger: '#d35f4e', colorBackground: '#211f1b', colorInput: '#302d27', colorInputForeground: '#f4f0e8', colorNeutral: '#5b554a', fontFamily: 'DM Sans', borderRadius: '0.75rem' },
  elements: {
    rootBox: 'w-full flex justify-center', cardBox: 'bg-[#211f1b] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#484237]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none', footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#f4f0e8]', headerSubtitle: 'text-[#b1aa9d]', socialButtonsBlockButtonText: 'text-[#f4f0e8]',
    formFieldLabel: 'text-[#e8e0d3]', footerActionLink: 'text-[#e1b84f]', footerActionText: 'text-[#b1aa9d]', dividerText: 'text-[#aaa397]',
    identityPreviewEditButton: 'text-[#e1b84f]', formFieldSuccessText: 'text-[#d9bd73]', alertText: 'text-[#f4f0e8]',
    logoBox: 'mb-3', logoImage: 'h-10 w-10', socialButtonsBlockButton: 'border-[#595347] bg-[#302d27] hover:bg-[#3b372f]',
    formButtonPrimary: 'bg-[#d8a83d] text-[#211f1b] hover:bg-[#e7bd62]', formFieldInput: 'border-[#595347] bg-[#302d27] text-[#f4f0e8]',
    footerAction: 'text-[#b1aa9d]', dividerLine: 'bg-[#595347]', alert: 'border-[#595347] bg-[#302d27]',
    otpCodeFieldInput: 'border-[#595347] bg-[#302d27] text-[#f4f0e8]', formFieldRow: 'text-[#f4f0e8]', main: 'text-[#f4f0e8]',
  },
};

type CartLine = { product: Product; quantity: number };
type CartContextValue = { lines: CartLine[]; add: (product: Product) => void; remove: (id: number) => void; clear: () => void };
import { createContext, useContext } from 'react';
const CartContext = createContext<CartContextValue | null>(null);
function useCart() { const value = useContext(CartContext); if (!value) throw new Error('Cart provider missing'); return value; }

function Meta({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    document.title = `${title} — Connect Sphere`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'description'); document.head.appendChild(meta); }
    meta.setAttribute('content', description);
  }, [title, description]);
  return null;
}
function Logo({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" aria-label="Connect Sphere home" className={`brand ${inverse ? 'brand-light' : ''}`} data-testid="link-brand-home">
    <span className="brand-mark"><svg viewBox="0 0 46 46" aria-hidden="true"><path d="M12 8v27h23" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square"/><path d="M18 27v-7m5 11V15m5 16V21m5 6v-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M8 39h31" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></span>
    <span className="brand-copy"><b>CONNECT SPHERE</b><small>HUSKAGENT TECHNOLOGY</small></span>
  </Link>;
}
const navLinks = [
  ['Home', '/'], ['Products', '/products'], ['Store', '/store'], ['Downloads', '/downloads'],
  ['Learn', '/learn'], ['News', '/news'], ['Support', '/support'], ['About Huskagent', '/about'],
];
function Header() {
  const [open, setOpen] = useState(false);
  return <header className="site-header">
    <div className="topline"><span>Independent tools for the sound you hear.</span><span className="mono">HUSKAGENT TECHNOLOGY COMPANY</span></div>
    <div className="nav-wrap"><Logo />
      <nav className={`main-nav ${open ? 'nav-open' : ''}`} aria-label="Main navigation">
        {navLinks.map(([label, href]) => label === 'Products'
          ? <details className="nav-dropdown" key={href}>
              <summary data-testid="link-nav-products">Products <ChevronDown size={13}/></summary>
              <div className="nav-submenu">
                <Link href="/products/laneucap-daw" onClick={() => setOpen(false)}>LaneuCap DAW</Link>
                <Link href="/products/laneucap-plugins" onClick={() => setOpen(false)}>LaneuCap Plugins</Link>
                <Link href="/products/audio-tools" onClick={() => setOpen(false)}>Audio Tools</Link>
                <Link href="/products" onClick={() => setOpen(false)}>All products</Link>
              </div>
            </details>
          : <Link key={href} href={href} onClick={() => setOpen(false)} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</Link>)}
        <div className="nav-mobile-auth">
          <Show when="signed-in"><Link href="/my-sphere" onClick={() => setOpen(false)}>My Sphere</Link></Show>
          <Show when="signed-out"><Link href="/sign-in" onClick={() => setOpen(false)}>Sign In</Link><Link href="/sign-up" onClick={() => setOpen(false)}>Create Account</Link></Show>
        </div>
      </nav>
      <div className="nav-actions">
        <Link href="/cart" className="icon-link" aria-label="Cart" data-testid="link-cart"><ShoppingBag size={18}/><span>Bag</span></Link>
        <Show when="signed-in"><Link href="/my-sphere" className="signin-link" data-testid="link-my-sphere">My Sphere <ArrowRight size={14}/></Link></Show>
        <Show when="signed-out"><Link href="/sign-in" className="signin-link" data-testid="link-sign-in">Sign In</Link><Link href="/sign-up" className="create-account-link" data-testid="link-create-account">Create Account</Link></Show>
        <button className="menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'} data-testid="button-mobile-menu">{open ? <X/> : <Menu/>}</button>
      </div>
    </div>
  </header>;
}
function Footer() {
  const [email, setEmail] = useState('');
  const newsletter = useSubscribeNewsletter();
  const [notice, setNotice] = useState('');
  function submit(e: FormEvent) { e.preventDefault(); newsletter.mutate({ data: { email } }, { onSuccess: r => { setNotice(r.message); setEmail(''); }, onError: () => setNotice('We could not save your email. Please try again.') }); }
  return <footer className="footer">
    <div className="footer-main"><div className="footer-brand"><Logo inverse/><p>Connect Sphere, the music software platform of Huskagent Technology Company.</p></div>
      <div><span className="footer-label">EXPLORE</span>{navLinks.slice(0,4).map(([l,h])=><Link key={h} href={h}>{l}</Link>)}<Link href="/products/laneucap-daw">LaneuCap DAW</Link><Link href="/products/laneucap-plugins">LaneuCap Plugins</Link><Link href="/products/audio-tools">Audio tools</Link><Link href="/downloads">Downloads</Link></div>
      <div><span className="footer-label">COMPANY</span><Link href="/about">About Huskagent</Link><Link href="/support">Contact & support</Link><Link href="/my-sphere">My Sphere</Link><Link href="/sign-in">Sign in</Link><Link href="/sign-up">Create account</Link></div>
      <form className="newsletter" onSubmit={submit}><span className="footer-label">NOTES FROM THE STUDIO</span><p>Signups are saved here. Newsletter email delivery is not configured.</p><div className="newsletter-field"><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your email address" aria-label="Email address" data-testid="input-newsletter-email"/><button disabled={newsletter.isPending} aria-label="Save newsletter signup" data-testid="button-newsletter-submit"><ArrowRight size={17}/></button></div>{notice&&<small role="status" data-testid="status-newsletter">{notice}</small>}</form>
    </div><div className="footer-bottom"><span>© {new Date().getFullYear()} Huskagent Technology Company</span><span>Built for the sound that is yours.</span><Link href="/support">Contact support</Link></div>
  </footer>;
}
function Shell({ children }: { children: ReactNode }) { return <div className="grain"><Header/><main>{children}</main><Footer/></div>; }
function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) { return <div className="section-heading"><span className="eyebrow">{eyebrow}</span><h2 className="display">{title}</h2>{text&&<p>{text}</p>}</div>; }
function ButtonLink({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) { return <Link href={href} className={`button-link ${secondary ? 'button-outline' : ''}`}>{children}<ArrowRight size={16}/></Link>; }
function LoadingState({ label = 'Tuning the signal…' }: { label?: string }) { return <div className="state-box" role="status"><div className="skeleton-bar"/><div className="skeleton-bar short"/><span>{label}</span></div>; }
function ErrorState({ retry }: { retry: () => void }) { return <div className="state-box"><CircleHelp size={28}/><h3>We lost the thread.</h3><p>The request did not come through. Give it another try.</p><button className="text-button" onClick={retry}>Try again <ArrowRight size={15}/></button></div>; }
function productStatusLabel(status: string) { return status === 'available' ? 'Available' : status === 'discontinued' ? 'Discontinued' : 'Coming soon'; }
function ProductTile({ product, index = 0 }: { product: Product; index?: number }) {
  const { add } = useCart();
  const canAdd = product.status === 'available' && product.priceCents !== null;
  return <article className={`product-tile tile-${index%3}`} data-testid={`card-product-${product.id}`}>
    <Link href={`/store/${product.slug}`} className="tile-art" data-testid={`link-product-${product.id}`}>
      {product.coverImageUrl ? <img src={product.coverImageUrl} alt={`${product.name} product image`} loading="lazy"/> : <div className="product-art-fallback"><AudioLines size={27}/><span className="eyebrow">{product.category.replaceAll('-', ' ')}</span><b className="display">{product.name}</b><small>CONNECT SPHERE PRODUCT</small></div>}
      <span className={`status-pill ${product.status === 'available' ? 'is-live' : ''}`}>{productStatusLabel(product.status)}</span>
    </Link>
    <div className="tile-copy"><div><span className="eyebrow">{product.category.replaceAll('-', ' ')}</span><h3 className="display">{product.name}</h3><p>{product.shortDescription}</p></div>
      <div className="tile-bottom"><strong>{product.priceCents !== null ? new Intl.NumberFormat('en-US',{style:'currency',currency:product.currency || 'USD'}).format(product.priceCents/100) : productStatusLabel(product.status)}</strong><Link href={`/store/${product.slug}`} aria-label={`Explore ${product.name}`} className="round-arrow" data-testid={`button-explore-product-${product.id}`}><ArrowRight size={17}/></Link></div>
      {canAdd&&<button className="quiet-add" onClick={()=>add(product)} data-testid={`button-add-product-${product.id}`}>Add to bag</button>}
    </div>
  </article>;
}
function ProductGrid({ products, loading, error, retry }: { products?: Product[]; loading: boolean; error: boolean; retry: () => void }) {
  if (loading) return <div className="product-grid">{[0,1,2].map(x=><div className="tile-skeleton" key={x}><div/><span/><span/></div>)}</div>;
  if (error) return <ErrorState retry={retry}/>;
  if (!products?.length) return <div className="empty-state"><Music2 size={30}/><h3>Nothing in this frequency yet.</h3><p>Try another search or check back soon.</p></div>;
  return <div className="product-grid">{products.map((p,i)=><ProductTile key={p.id} product={p} index={i}/>)}</div>;
}
function Home() {
  const products = useListProducts(undefined, { query: { queryKey: getListProductsQueryKey() } });
  const articles = useListArticles(undefined, { query: { queryKey: getListArticlesQueryKey() } });
  const releases = useListReleases(undefined, { query: { queryKey: getListReleasesQueryKey() } });
  const publishedProducts = products.data || [];
  const publishedArticles = articles.data || [];
  const plugins = publishedProducts.filter(product => product.kind === 'plugin');
  const instruments = publishedProducts.filter(product => ['instruments', 'synthesizers'].includes(product.category));
  const audioTools = publishedProducts.filter(product => product.category === 'audio-tools');
  const news = publishedArticles.filter(article => ['news', 'updates'].includes(article.category)).slice(0, 3);
  const lessons = publishedArticles.filter(article => !['news', 'updates'].includes(article.category)).slice(0, 3);
  const availableReleases = (releases.data || []).filter(release => release.downloadAvailable).slice(0, 2);
  return <>
    <Meta title="Connect Sphere — Huskagent Technology Company" description="Connect Sphere is the music-software platform from Huskagent Technology Company. LaneuCap DAW is its flagship software."/>
    <section className="hero">
      <div className="hero-vignette"/><div className="hero-glow"/>
      <div className="hero-content reveal"><span className="eyebrow gold">HUSKAGENT TECHNOLOGY COMPANY</span><h1 className="display">Make room<br/>for <em>your</em> sound.</h1><p>Connect Sphere is our music-software platform. LaneuCap DAW is the flagship software.</p><div className="hero-actions"><ButtonLink href="/products/laneucap-daw">Meet LaneuCap</ButtonLink><Link href="/about" className="hero-text-link">About Huskagent <ArrowDownRight size={17}/></Link></div></div>
      <div className="hero-visual" aria-hidden="true"><LaneuCapWordmark/><svg viewBox="0 0 520 110" role="presentation"><path d="M2 55h28l10-25 14 52 13-37 15 20 16-10h25l12-37 17 67 17-42 15 18h30l12-24 16 47 14-33 18 7h24l17-14 17 24 13-16h43l13-32 16 64 15-44 18 12h23" fill="none" stroke="currentColor" strokeWidth="2"/></svg><span className="mono">LANEUCAP DAW · FLAGSHIP SOFTWARE</span></div>
      <div className="hero-index mono">01 / CONNECT SPHERE</div>
    </section>
    <section className="intro-section"><div className="intro-index mono">01—OUR POINT OF VIEW</div><div className="intro-copy"><span className="eyebrow">MADE FOR MAKING</span><h2 className="display">Good tools get out<br/>of the <i>way.</i></h2><p>Huskagent Technology Company builds Connect Sphere as a home for music software, product information, learning resources, and support.</p><ButtonLink href="/about" secondary>Meet Huskagent</ButtonLink></div><div className="intro-mark" aria-hidden="true"><span className="orbit orbit-one"/><span className="orbit orbit-two"/><span className="orbit-core">CS</span></div></section>
    <section className="laneucap-feature"><div className="laneu-copy"><span className="eyebrow gold">FLAGSHIP SOFTWARE</span><h2 className="display">LaneuCap<br/><i>DAW</i></h2><p>The flagship software named by Huskagent Technology Company. Verified capabilities, operating-system support, system requirements, and a release file are shown only when configured from real product information.</p><ButtonLink href="/products/laneucap-daw">Product details</ButtonLink></div><div className="laneu-release-card"><LaneuCapWordmark/><span className="status-pill">No release configured</span><p>This site does not currently have a verified LaneuCap installer or published feature specification.</p><Link className="read-more" href="/downloads">Open download centre <ArrowRight size={15}/></Link></div></section>
    <section className="home-products"><div className="content-wrap"><div className="split-heading"><SectionHeading eyebrow="CURRENTLY PUBLISHED" title="Products and tools." text="This catalogue uses administrator-published product records. No sample products are displayed."/><ButtonLink href="/products" secondary>All products</ButtonLink></div><ProductGrid products={publishedProducts.slice(0,3)} loading={products.isLoading} error={products.isError} retry={()=>products.refetch()}/></div></section>
    <section className="home-workflow"><div className="content-wrap"><SectionHeading eyebrow="LANEUCAP SPECIFICATION" title="Verified details only." text="No tested LaneuCap feature list, compatibility matrix, or requirements are currently published on this site."/><div className="verified-detail-grid">{[['Audio production','No verified specification published'],['Operating system','Windows compatibility not verified'],['System requirements','Not published'],['Screenshots','No software screenshots uploaded']].map(([label,value])=><article key={label}><span className="eyebrow">{label}</span><b>{value}</b></article>)}</div><ButtonLink href="/products/laneucap-daw" secondary>Full LaneuCap details</ButtonLink></div></section>
    <section className="home-products home-collection"><div className="content-wrap"><div className="split-heading"><SectionHeading eyebrow="LANEUCAP PLUGINS" title="Effects and instruments." text="Only products entered and published by an administrator appear here."/><ButtonLink href="/products/laneucap-plugins" secondary>Plugin catalogue</ButtonLink></div><ProductGrid products={plugins} loading={products.isLoading} error={products.isError} retry={()=>products.refetch()}/></div></section>
    <section className="home-products home-instruments"><div className="content-wrap"><div className="split-heading"><SectionHeading eyebrow="VIRTUAL STUDIO" title="Instruments and tools." text="The catalogue stays empty until real product information is published."/><ButtonLink href="/products/audio-tools" secondary>Audio tools</ButtonLink></div><ProductGrid products={[...instruments,...audioTools]} loading={products.isLoading} error={products.isError} retry={()=>products.refetch()}/></div></section>
     <section className="home-store"><div className="content-wrap store-preview"><div><span className="eyebrow">CONNECT SPHERE STORE</span><h2 className="display">A clear catalogue.<br/><i>Honest checkout status.</i></h2><p>Prices are managed in the administrator catalogue. A payment provider is not connected, so the bag cannot complete a purchase.</p><ButtonLink href="/store">Browse the store</ButtonLink></div><div className="store-preview-state"><ShoppingBag size={28}/><b>Published listings only</b><span>Product cards come from the published catalogue.</span><span>Checkout stays unavailable until a payment provider is connected.</span></div></div></section>
    <section className="home-downloads"><div className="content-wrap downloads-preview"><div><span className="eyebrow">DOWNLOAD CENTRE</span><h2 className="display">Files, when they're real.</h2><p>Download links are shown only for releases configured with an HTTPS file, published metadata, and a recorded file size.</p><ButtonLink href="/downloads" secondary>Open downloads</ButtonLink></div><div className="downloads-preview-list">{releases.isLoading?<LoadingState label="Checking releases…"/>:releases.isError?<ErrorState retry={()=>releases.refetch()}/>:availableReleases.length?availableReleases.map(release=><div className="account-row" key={release.id}><div><b>{release.productName} · {release.version}</b><small>{release.platform}</small></div><a className="read-more" href={`/api/releases/${release.id}/download`}>Download <ArrowDownRight size={15}/></a></div>):<p>No release files are currently published.</p>}</div></div></section>
    <section className="journal-section"><div className="content-wrap"><div className="split-heading"><SectionHeading eyebrow="LATEST NEWS" title="Company and product updates." text="Published news is drawn from the company article catalogue."/><ButtonLink href="/news" secondary>All news</ButtonLink></div><ArticleGrid articles={news} loading={articles.isLoading} error={articles.isError} retry={()=>articles.refetch()}/></div></section>
    <section className="home-learning"><div className="content-wrap"><div className="split-heading"><SectionHeading eyebrow="LEARNING CENTRE" title="Guides from the studio." text="Only reviewed learning resources published by an administrator appear here."/><ButtonLink href="/learn" secondary>Browse learning</ButtonLink></div><ArticleGrid articles={lessons} loading={articles.isLoading} error={articles.isError} retry={()=>articles.refetch()}/></div></section>
    <section className="home-company"><div><span className="eyebrow">HUSKAGENT TECHNOLOGY COMPANY</span><h2 className="display">One company.<br/><i>One music platform.</i></h2><p>Huskagent Technology Company is the company behind Connect Sphere and its flagship software, LaneuCap DAW.</p><ButtonLink href="/about" secondary>About Huskagent</ButtonLink></div><div className="company-nameplate"><Logo inverse/><span className="mono">CONNECT SPHERE / MUSIC SOFTWARE</span></div></section>
    <section className="home-support"><div><span className="eyebrow">SUPPORT</span><h2 className="display">A clear answer, without the runaround.</h2><p>Search the FAQ or send a support request. Requests are saved in the site database; email notifications are not configured.</p></div><ButtonLink href="/support">Visit support</ButtonLink></section>
    <NewsletterBand/>
  </>;
}
function LaneuCapWordmark() {
  return <div className="laneu-wordmark" aria-label="LaneuCap DAW" data-testid="brand-laneucap">
    <span className="laneu-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M10 7v33h16" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="square"/><path d="M18 30v-7m6 11V14m6 20V20m6 11v-7" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round"/><path d="M7 43h34" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></span>
    <span><b>LaneuCap</b><small>DAW · CONNECT SPHERE</small></span>
  </div>;
}
function NewsletterBand() { const [email,setEmail]=useState('');const [msg,setMsg]=useState('');const sub=useSubscribeNewsletter();return <section className="newsletter-band"><div><span className="eyebrow">STAY IN THE LOOP</span><h2 className="display">Good things take<br/><i>listening.</i></h2></div><form onSubmit={e=>{e.preventDefault();sub.mutate({data:{email}},{onSuccess:r=>{setMsg(r.message);setEmail('')},onError:()=>setMsg('Could not save your email. Please try again.')})}}><label htmlFor="band-email">Your signup is stored; email delivery is not configured.</label><div className="newsletter-field light"><input id="band-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" data-testid="input-home-newsletter"/><button disabled={sub.isPending} aria-label="Save newsletter signup" data-testid="button-home-newsletter"><ArrowRight size={18}/></button></div>{msg&&<small role="status" data-testid="status-home-newsletter">{msg}</small>}</form></section>; }

function ProductIndex({ category }: { category?: string }) {
  const [search,setSearch]=useState('');
  const params = useMemo(()=>({ ...(search ? {search} : {}), ...(category ? {category: category as never} : {}) }),[search,category]);
  const q=useListProducts(params,{query:{queryKey:getListProductsQueryKey(params)}});
  const title=category==='daw'?'LaneuCap DAW':category==='plugin'?'LaneuCap Plugins':'Audio tools';
  return <><Meta title={category ? title : 'Products'} description="Browse published product listings from Connect Sphere."/><PageHero kicker="THE CONNECT SPHERE TOOLBOX" title={category ? title : 'Products and tools.'} sub="Only administrator-published product records appear in this catalogue. Availability and pricing follow the current record."/>
    <section className="catalog content-wrap"><div className="concept-links product-areas"><ButtonLink href="/products/laneucap-daw" secondary>LaneuCap DAW</ButtonLink><ButtonLink href="/products/laneucap-plugins" secondary>LaneuCap plugins</ButtonLink><ButtonLink href="/products/audio-tools" secondary>Audio tools</ButtonLink></div><div className="catalog-tools"><label className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search the collection" aria-label="Search products" data-testid="input-product-search"/></label><span className="mono">{q.data?.length ?? '—'} ITEMS</span></div><ProductGrid products={q.data} loading={q.isLoading} error={q.isError} retry={()=>q.refetch()}/></section></>;
}
function PageHero({ kicker,title,sub }: {kicker:string;title:string;sub:string}) { return <section className="page-hero"><span className="eyebrow">{kicker}</span><h1 className="display">{title}</h1><p>{sub}</p></section>; }
function DawProductPage() {
  const product = useGetProduct('laneucap-daw', { query: { queryKey: getGetProductQueryKey('laneucap-daw') } });
  const releaseParams = { productSlug: 'laneucap-daw' };
  const releases = useListReleases(releaseParams, { query: { queryKey: getListReleasesQueryKey(releaseParams) } });
  if (product.isLoading) return <LoadingState label="Loading LaneuCap product information…"/>;
  if (product.isError || !product.data) return <div className="content-wrap padded"><ErrorState retry={() => product.refetch()}/></div>;
  const p = product.data;
  const publishedReleases = (releases.data || []).filter(release => release.downloadAvailable);
  return <>
    <Meta title="LaneuCap DAW" description="LaneuCap DAW, flagship software from Huskagent Technology Company."/>
    <section className="daw-product-hero"><div className="daw-product-copy"><LaneuCapWordmark/><span className="eyebrow gold">FLAGSHIP SOFTWARE · HUSKAGENT TECHNOLOGY COMPANY</span><h1 className="display">LaneuCap<br/><i>DAW</i></h1><p>{p.description}</p><div className="hero-actions">{publishedReleases.length ? <a className="button-link" href={`/api/releases/${publishedReleases[0].id}/download`}>Download version {publishedReleases[0].version}<ArrowDownRight size={16}/></a> : <button className="button-link disabled" disabled aria-disabled="true" data-testid="button-laneucap-download-unavailable">No verified release file <ArrowDownRight size={16}/></button>}<ButtonLink href="/downloads" secondary>All downloads</ButtonLink></div></div><div className="daw-product-visual"><AudioLines size={42}/><span className="eyebrow">PRODUCT SCREENSHOTS</span><p>No LaneuCap software screenshots have been published.</p></div></section>
    <section className="content-wrap daw-spec-section"><div className="split-heading"><SectionHeading eyebrow="SPECIFICATION STATUS" title="Verified information only." text="Requested areas are listed to show what remains undocumented. None are presented as implemented or tested LaneuCap features."/></div><div className="daw-request-grid">{['Beat making','Multitrack audio recording','MIDI sequencing','Piano roll','Playlist and arrangement','Mixer and audio effects','Plugin support','Audio export and mastering'].map(item=><article key={item}><b>{item}</b><span>Not verified or published</span></article>)}</div></section>
    <section className="content-wrap daw-release-section"><SectionHeading eyebrow="PLATFORM & RELEASES" title="Product status." text="Windows desktop is the requested target. Compatibility is not verified; use the release information below rather than assuming support."/><div className="daw-release-grid"><article><span className="eyebrow">WINDOWS COMPATIBILITY</span><b>Not verified</b></article><article><span className="eyebrow">SYSTEM REQUIREMENTS</span><b>{publishedReleases[0]?.systemRequirements || 'Not published'}</b></article><article><span className="eyebrow">CURRENT VERSION</span><b>{publishedReleases[0]?.version || p.version || 'No released version'}</b></article></div><div className="daw-changelog"><div className="panel-heading"><div><span className="eyebrow">CHANGELOG</span><h2 className="display">Released updates</h2></div><Link href="/downloads">Release centre <ArrowRight size={15}/></Link></div>{releases.isLoading?<LoadingState label="Loading release history…"/>:releases.isError?<ErrorState retry={()=>releases.refetch()}/>:publishedReleases.length?publishedReleases.map(release=><article className="account-row" key={release.id}><div><b>Version {release.version} · {release.platform}</b><small>{new Date(release.publishedAt).toLocaleDateString()}</small><p>{release.releaseNotes}</p></div>{release.downloadAvailable&&<a className="read-more" href={`/api/releases/${release.id}/download`}>Download <ArrowDownRight size={15}/></a>}</article>):<p className="muted">No released versions or changelog entries are published yet.</p>}</div></section>
    <section className="content-wrap daw-feature-foot"><div><span className="eyebrow">PRODUCT LISTING</span><h2 className="display">{productStatusLabel(p.status)}</h2><p>{p.shortDescription}</p></div><ButtonLink href="/support" secondary>Ask about LaneuCap</ButtonLink></section>
    <NewsletterBand/>
  </>;
}
function ConceptPage({kind}:{kind:'plugins'|'tools'}) {
  const [search, setSearch] = useState('');
  const params = useMemo(() => ({ ...(search.trim() ? { search: search.trim() } : {}) }), [search]);
  const q = useListProducts(params, { query: { queryKey: getListProductsQueryKey(params) } });
  const items = (q.data || []).filter(product => kind === 'plugins' ? product.kind === 'plugin' : product.kind === 'tool');
  const title = kind === 'plugins' ? 'LaneuCap Plugins' : 'Audio Tools';
  const description = kind === 'plugins'
    ? 'Browse plugin products that have been entered and published by Huskagent Technology Company.'
    : 'Browse audio-tool products that have been entered and published by Huskagent Technology Company.';
  return <><Meta title={title} description={description}/><PageHero kicker={kind === 'plugins' ? 'LANEUCAP PLUGINS' : 'CONNECT SPHERE AUDIO TOOLS'} title={title} sub="This catalogue uses real published product records; it does not display concept cards or simulated plugin interfaces."/><section className="catalog content-wrap"><div className="catalog-tools"><label className="search-box"><Search size={17}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder={`Search ${kind === 'plugins' ? 'plugins' : 'audio tools'}`} aria-label={`Search ${title}`}/></label><span className="mono">{items.length} ITEMS</span></div><ProductGrid products={items} loading={q.isLoading} error={q.isError} retry={() => q.refetch()}/><div className="catalog-note"><span className="eyebrow">PRODUCT DATA</span><p>Only administrator-published products appear here. Formats, compatibility, and features are shown only when configured in the product record.</p><ButtonLink href="/store" secondary>Open full store</ButtonLink></div></section><NewsletterBand/></>;
}
function Store() {
  const [search,setSearch]=useState('');const [category,setCategory]=useState('all');
  const params=useMemo(()=>({...(search?{search}:{}),...(category!=='all'?{category:category as never}:{})}),[search,category]);
  const q=useListProducts(params,{query:{queryKey:getListProductsQueryKey(params)}});
  const categories=['all','daw','instruments','eq','compressors','reverb-delay','saturation','synthesizers','audio-tools'];
  return <><Meta title="Store" description="Browse the Connect Sphere product catalogue. Availability is shown from current product data."/><PageHero kicker="THE STORE" title="Find your next instrument." sub="Browse the collection and follow what is taking shape. Only items marked available with a listed price may be added to your bag."/><section className="catalog content-wrap"><div className="store-filter"><label className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products" aria-label="Search store" data-testid="input-store-search"/></label><div className="category-chips" role="group" aria-label="Filter categories">{categories.map(c=><button key={c} className={category===c?'chip active':'chip'} onClick={()=>setCategory(c)} data-testid={`button-filter-${c}`}>{c==='all'?'All':c.replaceAll('-',' ')}</button>)}</div></div><ProductGrid products={q.data} loading={q.isLoading} error={q.isError} retry={()=>q.refetch()}/></section></>;
}
function ProductDetail({slug}:{slug:string}) {
  const q=useGetProduct(slug,{query:{queryKey:getGetProductQueryKey(slug)}});const {add}=useCart();
  if(q.isLoading)return <LoadingState label="Finding the product page…"/>;if(q.isError||!q.data)return <><Meta title="Product not found" description="This product could not be found."/><div className="content-wrap padded"><ErrorState retry={()=>q.refetch()}/></div></>;
   const p=q.data;const available=p.status==='available'&&p.priceCents!==null;
   return <><Meta title={p.name} description={p.shortDescription}/><section className="detail-hero"><div className="detail-art">{p.coverImageUrl?<img src={p.coverImageUrl} alt={`${p.name} product image`}/>:<div className="product-art-fallback large"><AudioLines size={36}/><span className="eyebrow">{p.category.replaceAll('-',' ')}</span><b className="display">{p.name}</b></div>}</div><div className="detail-copy"><Link href="/store" className="back-link"><ArrowLeft size={15}/> All products</Link><span className="eyebrow">{p.category.replaceAll('-',' ')} · {p.kind}</span><h1 className="display">{p.name}</h1><p className="detail-lede">{p.shortDescription}</p><p>{p.description}</p><div className="detail-meta"><span className="status-pill">{productStatusLabel(p.status)}</span>{p.version&&<span className="mono">VERSION {p.version}</span>}</div>{p.featureTags?.length>0&&<div className="tags">{p.featureTags.map(t=><span key={t}>{t}</span>)}</div>}{available?<><strong className="detail-price">{new Intl.NumberFormat('en-US',{style:'currency',currency:p.currency||'USD'}).format(p.priceCents!/100)}</strong><button className="button-link" onClick={()=>add(p)} data-testid="button-add-to-cart">Add to bag <ShoppingBag size={16}/></button></>:<div className="availability-note">No purchase or download is available for this item.</div>}</div></section><section className="content-wrap detail-bottom"><div><span className="eyebrow">PRODUCT INFORMATION</span><h2 className="display">Published details.</h2></div><p>Product information is managed by Huskagent Technology Company. A listed price or product description does not establish that a downloadable build or payment service is available; the release centre reports those separately.</p><ButtonLink href="/support" secondary>Questions? Contact us</ButtonLink></section></>;
}
function CartPage() {
  const {lines,remove}=useCart();const total=lines.reduce((n,l)=>n+(l.product.priceCents||0)*l.quantity,0);
  return <><Meta title="Your bag" description="Your Connect Sphere bag."/><PageHero kicker="YOUR BAG" title="A little room for good things." sub="Your bag only includes products marked available with a listed price."/><section className="content-wrap cart-area">{lines.length===0?<div className="empty-state cart-empty"><ShoppingBag size={32}/><h2 className="display">Your bag is quiet.</h2><p>There are no purchasable products in it yet.</p><ButtonLink href="/store">Browse the store</ButtonLink></div>:<><div className="cart-lines">{lines.map(({product,quantity})=><article className="cart-line" key={product.id}><div className="cart-thumb"><AudioLines/></div><div><h2>{product.name}</h2><p>{product.shortDescription}</p><span className="mono">QTY {quantity}</span></div><strong>{new Intl.NumberFormat('en-US',{style:'currency',currency:product.currency||'USD'}).format((product.priceCents||0)*quantity/100)}</strong><button className="text-button" onClick={()=>remove(product.id)} data-testid={`button-remove-cart-${product.id}`}>Remove</button></article>)}</div><aside className="cart-summary"><span className="eyebrow">ORDER SUMMARY</span><div><span>Subtotal</span><b>{new Intl.NumberFormat('en-US',{style:'currency',currency:lines[0]?.product.currency||'USD'}).format(total/100)}</b></div><p>Taxes and any applicable fees are calculated by a payment provider. No payment provider is connected, so checkout is unavailable.</p><button className="button-link disabled" disabled data-testid="button-checkout-disabled">Checkout unavailable <ShoppingBag size={16}/></button><button className="text-button" onClick={()=>lines.forEach(l=>remove(l.product.id))} data-testid="button-clear-cart">Clear bag</button></aside></>}</section></>;
}
function Downloads() {
  const q=useListReleases(undefined,{query:{queryKey:getListReleasesQueryKey()}});
  return <><Meta title="Downloads" description="Official Connect Sphere release availability and downloads."/><PageHero kicker="RELEASES & DOWNLOADS" title="Only what is ready." sub="A file appears here only when a real release is configured and the API confirms it is available."/><section className="content-wrap downloads-area">{q.isLoading?<LoadingState label="Checking release availability…"/>:q.isError?<ErrorState retry={()=>q.refetch()}/>:!q.data?.length?<div className="empty-state"><AudioLines size={32}/><h2 className="display">No releases published.</h2><p>No real installer, plugin package, or documentation file is configured for download.</p></div>:<div className="release-list">{q.data.map((r:Release)=><article key={r.id} className="release-row" data-testid={`card-release-${r.id}`}><div><span className="eyebrow">{r.productName} · {r.platform}</span><h2 className="display">Version {r.version}</h2><p>{r.releaseNotes}</p><small>{r.systemRequirements}</small></div><div className="release-action">{r.downloadAvailable?<a className="button-link" href={`/api/releases/${r.id}/download`} data-testid={`link-download-${r.id}`}>Download release <ArrowDownRight size={16}/></a>:<span className="status-pill">No file configured</span>}{r.fileSizeBytes !== null && <small>{(r.fileSizeBytes/1048576).toFixed(1)} MB</small>}</div></article>)}</div>}</section></>;
}

function ArticleCard({article,index=0}:{article:Article;index?:number}) {
 const href=article.category==='news'||article.category==='updates'?`/news/${article.slug}`:`/learn/${article.slug}`;
 return <article className={`article-card article-${index%3}`} data-testid={`card-article-${article.id}`}><Link href={href} className="article-image">{article.coverImageUrl?<img src={article.coverImageUrl} alt="" loading="lazy"/>:<div className="article-art"><span className="display">{article.category.slice(0,2).toUpperCase()}</span><small>CONNECT SPHERE / FIELD NOTES</small></div>}</Link><div className="article-info"><div className="article-meta"><span className="eyebrow">{article.category.replaceAll('-',' ')}</span><time>{article.publishedAt?new Date(article.publishedAt).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}):''}</time></div><h3 className="display"><Link href={href}>{article.title}</Link></h3><p>{article.summary}</p><Link className="read-more" href={href}>Read the story <ArrowRight size={15}/></Link></div></article>;
}
function ArticleGrid({articles,loading,error,retry}:{articles:Article[];loading:boolean;error:boolean;retry:()=>void}) { if(loading)return <div className="article-grid">{[0,1,2].map(x=><div className="tile-skeleton" key={x}><div/><span/><span/></div>)}</div>;if(error)return <ErrorState retry={retry}/>;if(!articles.length)return <div className="empty-state"><Music2/><h3>Quiet on the journal page.</h3><p>New stories will land here when they are published.</p></div>;return <div className="article-grid">{articles.map((a,i)=><ArticleCard key={a.id} article={a} index={i}/>)}</div>; }
function ArticleIndex({news=false}:{news?:boolean}) {
 const [search,setSearch]=useState('');const [category,setCategory]=useState('all');const supported=news?['all','news','updates']:['all','tutorials','getting-started','beat-making','recording','mixing','mastering','documentation'];
 const params=useMemo(()=>({...(search?{search}:{}),...(category!=='all'?{category:category as never}:{})}),[search,category]);
 const q=useListArticles(params,{query:{queryKey:getListArticlesQueryKey(params)}});
 const results=(q.data||[]).filter(a=>news?['news','updates'].includes(a.category):!['news','updates'].includes(a.category));
 return <><Meta title={news?'News':'Learn'} description={news?'Updates and stories from Connect Sphere.':'Practical learning and studio notes from Connect Sphere.'}/><PageHero kicker={news?'FROM THE COMPANY':'THE LEARNING ROOM'} title={news?'A signal from us.':'Make a little more sense.'} sub={news?'Product notes, company news, and ideas in motion.':'Guides, approaches, and small discoveries to take back to your music.'}/><section className="catalog content-wrap"><div className="store-filter"><label className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${news?'news':'articles'}`} data-testid="input-article-search"/></label><div className="category-chips">{supported.map(c=><button key={c} className={category===c?'chip active':'chip'} onClick={()=>setCategory(c)} data-testid={`button-article-filter-${c}`}>{c==='all'?'All':c.replaceAll('-',' ')}</button>)}</div></div><ArticleGrid articles={results} loading={q.isLoading} error={q.isError} retry={()=>q.refetch()}/></section></>;
}
function ArticleDetail({slug}:{slug:string}) {
 const q=useGetArticle(slug,{query:{queryKey:getGetArticleQueryKey(slug)}});
 if(q.isLoading)return <LoadingState label="Opening the story…"/>;if(q.isError||!q.data)return <div className="content-wrap padded"><ErrorState retry={()=>q.refetch()}/></div>;
 const a=q.data;const news=a.category==='news'||a.category==='updates';return <><Meta title={a.title} description={a.summary}/><article className="story"><Link href={news?'/news':'/learn'} className="back-link"><ArrowLeft size={15}/> Back to {news?'news':'learn'}</Link><div className="story-heading"><span className="eyebrow">{a.category.replaceAll('-',' ')}</span><h1 className="display">{a.title}</h1><p>{a.summary}</p><time>{a.publishedAt?new Date(a.publishedAt).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}):''}</time></div>{a.coverImageUrl&&<img className="story-cover" src={a.coverImageUrl} alt=""/>}<div className="story-content" data-testid="content-article"><div className="prose">{a.content.split(/\n+/).map((line,i)=>line.trim()&&<p key={i}>{line}</p>)}</div></div><div className="story-end"><span className="eyebrow">END OF THE SIDE A</span><ButtonLink href={news?'/news':'/learn'} secondary>More {news?'news':'field notes'}</ButtonLink></div></article></>;
}
function AdminProductCreateForm() {
  const create = useCreateAdminProduct();
  const [notice, setNotice] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const rawPrice = String(values.get('price') || '').trim();
    const amount = rawPrice === '' ? null : Number(rawPrice);
    const status = String(values.get('status')) as AdminProduct['status'];
    if (amount !== null && (!Number.isFinite(amount) || amount < 0 || Math.round(amount * 100) !== amount * 100)) {
      setNotice('Enter a non-negative price with no more than two decimal places.');
      return;
    }
    if (status === 'available' && amount === null) {
      setNotice('Set a price before marking a product available.');
      return;
    }
    create.mutate({ data: {
      slug: String(values.get('slug')).trim(),
      name: String(values.get('name')).trim(),
      shortDescription: String(values.get('shortDescription')).trim(),
      description: String(values.get('description')).trim(),
      category: String(values.get('category')) as AdminProductInput['category'],
      kind: String(values.get('kind')) as AdminProductInput['kind'],
      priceCents: amount === null ? null : Math.round(amount * 100),
      currency: String(values.get('currency')).trim().toUpperCase(),
      status,
      version: null,
      featureTags: [],
      coverImageUrl: null,
      isPublished: values.get('isPublished') === 'on',
    } }, {
      onSuccess: product => {
        queryClient.setQueryData<AdminProduct[]>(getListAdminProductsQueryKey(), current => [...(current || []), product].sort((a, b) => a.name.localeCompare(b.name)));
        setNotice('Product record created.');
        form.reset();
      },
      onError: () => setNotice('Could not create this product. Check the fields and make sure the URL is unique.'),
    });
  }
  return <form className="admin-create-form" onSubmit={submit} data-testid="form-admin-create-product">
    <div><span className="eyebrow">CATALOGUE ADMINISTRATION</span><h2 className="display">Add a real product listing.</h2><p>Enter verified product information. New listings are private until you publish them.</p></div>
    <div className="admin-create-grid">
      <label>Product name<input name="name" required maxLength={160} data-testid="input-admin-product-name"/></label>
      <label>URL slug<input name="slug" required minLength={2} maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="laneucap-plugins" data-testid="input-admin-product-slug"/></label>
      <label>Product type<select name="kind" defaultValue="plugin"><option value="daw">DAW</option><option value="plugin">Plugin</option><option value="tool">Audio tool</option></select></label>
      <label>Store category<select name="category" defaultValue="saturation"><option value="daw">DAW</option><option value="instruments">Instruments</option><option value="eq">EQ</option><option value="compressors">Compressors</option><option value="reverb-delay">Reverb &amp; delay</option><option value="saturation">Saturation</option><option value="synthesizers">Synthesizers</option><option value="audio-tools">Audio tools</option></select></label>
      <label>Short description<input name="shortDescription" required maxLength={280}/></label>
      <label>Currency<input name="currency" required defaultValue="USD" maxLength={3} pattern="[A-Z]{3}"/></label>
      <label>Price (optional)<input name="price" type="number" min="0" step="0.01" placeholder="Leave blank if not priced"/></label>
      <label>Availability<select name="status" defaultValue="coming_soon"><option value="coming_soon">Coming soon</option><option value="available">Available</option><option value="discontinued">Discontinued</option></select></label>
      <label className="admin-description">Full description<textarea name="description" required minLength={1} maxLength={12000} rows={4}/></label>
      <label className="admin-publish"><input type="checkbox" name="isPublished"/> Publish this product</label>
    </div>
    <button className="button-link" type="submit" disabled={create.isPending} data-testid="button-admin-create-product">{create.isPending ? 'Saving…' : 'Create product'} <ArrowRight size={15}/></button>
    {notice&&<p className={notice.startsWith('Could not')||notice.startsWith('Set')||notice.startsWith('Enter')?'form-error':'form-success'} role="status">{notice}</p>}
  </form>;
}
function AdminProductEditor({ product }: { product: AdminProduct }) {
  const [price, setPrice] = useState(product.priceCents === null ? '' : (product.priceCents / 100).toFixed(2));
  const [currency, setCurrency] = useState(product.currency);
  const [status, setStatus] = useState<AdminProduct['status']>(product.status);
  const [published, setPublished] = useState(product.isPublished);
  const [notice, setNotice] = useState('');
  const update = useUpdateAdminProduct();
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = price.trim() === '' ? null : Number(price);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0 || Math.round(amount * 100) !== amount * 100)) {
      setNotice('Enter a non-negative price with no more than two decimal places.');
      return;
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      setNotice('Enter a three-letter currency code, such as USD.');
      return;
    }
    update.mutate({ id: product.id, data: { priceCents: amount === null ? null : Math.round(amount * 100), currency, status, isPublished: published } }, {
      onSuccess: saved => {
        queryClient.setQueryData<AdminProduct[]>(getListAdminProductsQueryKey(), current => current?.map(item => item.id === saved.id ? saved : item));
        setNotice('Product settings saved.');
      },
      onError: () => setNotice('Could not save these settings. Check the price and try again.'),
    });
  }
  return <article className="admin-product-row" data-testid={`admin-product-${product.id}`}>
    <div className="admin-product-heading"><span className="eyebrow">{product.kind} · {product.category.replaceAll('-', ' ')}</span><h2 className="display">{product.name}</h2><small>/{product.slug}</small></div>
    <form className="admin-product-form" onSubmit={save}>
      <label>Price<input type="number" min="0" step="0.01" value={price} onChange={event => setPrice(event.target.value)} placeholder="Leave blank to unset" aria-label={`Price for ${product.name}`} data-testid={`input-admin-price-${product.id}`}/></label>
      <label>Currency<input value={currency} maxLength={3} onChange={event => setCurrency(event.target.value.toUpperCase())} aria-label={`Currency for ${product.name}`} data-testid={`input-admin-currency-${product.id}`}/></label>
      <label>Availability<select value={status} onChange={event => setStatus(event.target.value as AdminProduct['status'])} aria-label={`Availability for ${product.name}`} data-testid={`select-admin-status-${product.id}`}><option value="coming_soon">Coming soon</option><option value="available">Available</option><option value="discontinued">Discontinued</option></select></label>
      <label className="admin-publish"><input type="checkbox" checked={published} onChange={event => setPublished(event.target.checked)} data-testid={`checkbox-admin-publish-${product.id}`}/> Published</label>
      <button className="button-link" type="submit" disabled={update.isPending} data-testid={`button-admin-save-${product.id}`}>{update.isPending ? 'Saving…' : 'Save settings'} <ArrowRight size={15}/></button>
      {notice && <small className={notice.includes('Could not') || notice.startsWith('Enter') ? 'form-error' : 'form-success'} role="status">{notice}</small>}
    </form>
  </article>;
}
function AdminCatalog() {
  const q = useListAdminProducts({ query: { queryKey: getListAdminProductsQueryKey() } });
  return <><Meta title="Catalog administration" description="Manage Connect Sphere product prices and publication state."/><PageHero kicker="ADMINISTRATION" title="Product catalogue." sub="Configure product prices, availability, and storefront visibility. This does not process payments or configure release files."/><section className="content-wrap admin-catalog">
    {q.isLoading ? <LoadingState label="Loading product settings…"/> : q.isError ? <div className="admin-denied"><h2 className="display">Administrator access required.</h2><p>This area is limited to accounts assigned the administrator role. If you are an administrator, reload or try again.</p><button className="text-button" onClick={() => q.refetch()}>Try again</button></div> : <><AdminProductCreateForm/>{q.data?.map(product => <AdminProductEditor key={product.id} product={product}/>)}</>}
  </section></>;
}
function Support() {
 const [search,setSearch]=useState('');const [filter,setFilter]=useState('all');
 const [notice,setNotice]=useState('');const request=useCreateSupportRequest();
  const faq=[{cat:'products',q:'Is LaneuCap available to download?',a:'No verified LaneuCap release file is configured in the download centre.'},{cat:'products',q:'Which operating systems are supported?',a:'No LaneuCap platform compatibility has been verified or published on this site.'},{cat:'downloads',q:'Where can I find product downloads?',a:'A download link is shown only when release information and a valid configured file are available.'},{cat:'account',q:'How do I access My Sphere?',a:'Use the sign-in link and complete authentication through the managed Clerk provider. Account pages require a real signed-in session.'},{cat:'billing',q:'Can I purchase a product here?',a:'The bag can list products that are marked available and priced, but no payment provider is connected and checkout is disabled.'},{cat:'support',q:'How are support requests handled?',a:'Requests are saved in the site database. Email notifications and a response workflow are not configured.'}];
 const filtered=faq.filter(f=>(filter==='all'||f.cat===filter)&&(`${f.q} ${f.a}`).toLowerCase().includes(search.toLowerCase()));
  function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;const fd=new FormData(form);request.mutate({data:{name:String(fd.get('name')),email:String(fd.get('email')),category:String(fd.get('category')) as never,subject:String(fd.get('subject')),message:String(fd.get('message'))}},{onSuccess:r=>{setNotice(`Request #${r.id} saved. ${r.message}`);form.reset()},onError:()=>setNotice('Your request could not be submitted. Please try again.')});}
  return <><Meta title="Support" description="Find answers or submit a support request to Connect Sphere."/><PageHero kicker="SUPPORT" title="How can we help?" sub="Search verified product information or submit a support request. Requests are saved, but email notifications are not configured."/><section className="support-layout content-wrap"><div className="faq-side"><span className="eyebrow">COMMON QUESTIONS</span><label className="search-box faq-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search answers" data-testid="input-faq-search"/></label><div className="category-chips">{['all','products','downloads','account','billing','support'].map(c=><button key={c} className={filter===c?'chip active':'chip'} onClick={()=>setFilter(c)} data-testid={`button-faq-filter-${c}`}>{c}</button>)}</div><div className="faq-list">{filtered.map((f,i)=><details key={f.q} className="faq-item"><summary data-testid={`faq-question-${i}`}>{f.q}<ChevronDown size={17}/></summary><p>{f.a}</p></details>)}{!filtered.length&&<p className="muted">No answer matched. Submit a request; it will be stored in the site database.</p>}</div></div><form className="support-form" onSubmit={submit}><span className="eyebrow">SUPPORT REQUEST FORM</span><h2 className="display">Send a request.</h2><p>Submitting this form stores your request in the site database. No email notification is sent.</p><label>Your name<input name="name" required maxLength={120} data-testid="input-support-name"/></label><label>Email address<input name="email" type="email" required maxLength={254} data-testid="input-support-email"/></label><label>Topic<select name="category" required data-testid="select-support-category"><option value="other">Something else</option><option value="product">Product question</option><option value="downloads">Downloads</option><option value="account-license">Account or license</option><option value="billing">Billing</option></select></label><label>Subject<input name="subject" required minLength={3} maxLength={160} data-testid="input-support-subject"/></label><label>How can we help?<textarea name="message" required minLength={10} maxLength={5000} rows={5} data-testid="input-support-message"/></label><button className="button-link" disabled={request.isPending} data-testid="button-support-submit">{request.isPending?'Saving…':'Save support request'} <ArrowRight size={16}/></button>{notice&&<p className={request.isError?'form-error':'form-success'} role="status" data-testid="status-support">{notice}</p>}</form></section></>;
}
function About() { return <><Meta title="About Huskagent Technology" description="Huskagent Technology Company, Connect Sphere, and LaneuCap DAW."/><PageHero kicker="HUSKAGENT TECHNOLOGY COMPANY" title="The company behind Connect Sphere." sub="Huskagent Technology Company identifies Connect Sphere as its music software platform and LaneuCap DAW as its flagship software."/><section className="about-story content-wrap"><div className="about-column"><span className="eyebrow">THE ECOSYSTEM</span><h2 className="display">Company. Platform. Product.</h2><p>Huskagent Technology Company is the company. Connect Sphere is its platform for product information, downloads, learning resources, support, and account access. LaneuCap DAW is the flagship software.</p></div><div className="about-column offset"><span className="eyebrow">CURRENT AVAILABILITY</span><h2 className="display">Verified before published.</h2><p>This website does not currently have a LaneuCap installer, verified software specification, or published release configured. Its product and download pages show that status directly.</p><ButtonLink href="/products/laneucap-daw">LaneuCap details</ButtonLink></div><div className="about-quote"><div className="orbit orbit-one"/><span className="display">Huskagent Technology Company</span></div></section><NewsletterBand/></>; }
function DownloadsSummary({releases}:{releases:Release[]}) { const available=releases.filter(r=>r.downloadAvailable);return <div className="account-panel"><div className="panel-heading"><div><span className="eyebrow">DOWNLOAD HISTORY</span><h2 className="display">Your release shelf</h2></div><Link href="/downloads">All releases <ArrowRight size={15}/></Link></div>{available.length?available.map(r=><div className="account-row" key={r.id}><div><b>{r.productName}</b><small>{r.platform} · {r.version}</small></div><a href={`/api/releases/${r.id}/download`} className="read-more">Download <ArrowDownRight size={15}/></a></div>):<p className="muted">No downloadable releases are configured right now.</p>}</div>; }
function MySphere() {
 const q=useGetAccountOverview({query:{queryKey:getGetAccountOverviewQueryKey()}});const releases=useListReleases(undefined,{query:{queryKey:getListReleasesQueryKey()}});
 const {user,isLoaded}=useUser();const {signOut}=useClerk();
 if(!isLoaded)return <LoadingState label="Checking your account…"/>;
 if(q.isLoading)return <LoadingState label="Opening your sphere…"/>;
 if(q.isError)return <div className="content-wrap padded"><ErrorState retry={()=>q.refetch()}/><p className="muted">Account details require an active signed-in session.</p></div>;
 const a=q.data!;
  return <>
    <Meta title="My Sphere" description="Your Connect Sphere account overview."/>
    <section className="account-hero"><span className="eyebrow">YOUR SPACE</span><h1 className="display">Welcome back{a.profile.displayName?`, ${a.profile.displayName.split(' ')[0]}`:''}.</h1><p>A home for the products and releases connected to your work.</p></section>
    <section className="account-content content-wrap">
      <div className="account-welcome">
        <div className="avatar-initials">{(a.profile.displayName||a.profile.email||'S').slice(0,1).toUpperCase()}</div>
        <div><span className="eyebrow">SIGNED IN AS</span><h2>{a.profile.displayName||a.profile.email||user?.primaryEmailAddress?.emailAddress||'Connect Sphere member'}</h2><p>{a.profile.email}</p></div>
        <div className="account-actions">{a.isAdmin&&<Link className="read-more" href="/admin/catalog" data-testid="link-admin-catalog">Catalog administration <ArrowRight size={15}/></Link>}<button className="text-button" onClick={()=>signOut({redirectUrl:basePath||'/'})} data-testid="button-sign-out">Sign out</button></div>
      </div>
      <div className="account-stats"><div><span className="mono">{a.registeredProducts.length}</span><small>Registered products</small></div><div><span className="mono">{a.licenses.length}</span><small>Licenses</small></div><div><span className="mono">{a.purchaseHistory.length}</span><small>Orders</small></div><div><span className="mono">{a.downloadHistory.length}</span><small>Downloads</small></div></div>
      <div className="account-panel"><span className="eyebrow">REGISTERED PRODUCTS</span><h2 className="display">Your tools</h2>{a.registeredProducts.length?a.registeredProducts.map((p,i)=><div className="account-row" key={`${p.slug}-${i}`}><b>{p.name}</b><Link href={`/store/${p.slug}`} className="read-more">View product <ArrowRight size={15}/></Link></div>):<p className="muted">No products are registered yet.</p>}</div>
      <div className="account-panel"><span className="eyebrow">LICENSES</span><h2 className="display">Your licenses</h2>{a.licenses.length?a.licenses.map((l,i)=><div className="account-row" key={`${l.productName}-${i}`}><div><b>{l.productName}</b><small>{l.status} · issued {new Date(l.issuedAt).toLocaleDateString()}</small></div></div>):<p className="muted">No licenses are listed for this account.</p>}</div>
      <div className="account-panel"><span className="eyebrow">PURCHASE HISTORY</span><h2 className="display">Orders</h2>{a.purchaseHistory.length?a.purchaseHistory.map(o=><div className="account-row" key={o.orderNumber}><div><b>Order {o.orderNumber}</b><small>{o.status} · {new Date(o.createdAt).toLocaleDateString()}</small></div><strong>{new Intl.NumberFormat('en-US',{style:'currency',currency:o.currency}).format(o.amountCents/100)}</strong></div>):<p className="muted">No purchases are recorded for this account.</p>}</div>
      <div className="account-panel"><span className="eyebrow">DOWNLOAD HISTORY</span><h2 className="display">Recent downloads</h2>{a.downloadHistory.length?a.downloadHistory.map((download,index)=><div className="account-row" key={`${download.productName}-${download.version}-${download.downloadedAt}-${index}`}><div><b>{download.productName} · {download.version}</b><small>Downloaded {new Date(download.downloadedAt).toLocaleString()}</small></div></div>):<p className="muted">No downloads are recorded for this account.</p>}</div>
      <DownloadsSummary releases={releases.data||[]}/>
      <details className="account-settings"><summary><span><b>Profile, account settings &amp; security</b><small>Manage personal details, sign-in methods, and security with Clerk.</small></span><ChevronDown size={18}/></summary><div className="clerk-profile"><UserProfile routing="hash"/></div></details>
    </section>
  </>;
}
function SignInPage(){return <><Meta title="Sign in" description="Sign in to your Connect Sphere account."/><div className="auth-screen"><div className="auth-background"/><div className="auth-top"><Logo inverse/><Link href="/" className="hero-text-link">Back to Connect Sphere <ArrowRight size={15}/></Link></div><div className="auth-intro"><span className="eyebrow gold">YOUR SPACE, YOUR SOUND</span><h1 className="display">Come on in.</h1><p>Sign in to your Connect Sphere account.</p></div><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}/></div></>}
function SignUpPage(){return <><Meta title="Create your account" description="Join Connect Sphere and keep your account activity together."/><div className="auth-screen"><div className="auth-background"/><div className="auth-top"><Logo inverse/><Link href="/" className="hero-text-link">Back to Connect Sphere <ArrowRight size={15}/></Link></div><div className="auth-intro"><span className="eyebrow gold">A PLACE TO BEGIN</span><h1 className="display">Join the sphere.</h1><p>Create an account to keep your Connect Sphere activity together.</p></div><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`}/></div></>}
function ProtectedAccount(){return <><Show when="signed-in"><Shell><MySphere/></Shell></Show><Show when="signed-out"><Navigate to="/sign-in" replace/></Show></>}
function ProtectedAdmin(){return <><Show when="signed-in"><Shell><AdminCatalog/></Shell></Show><Show when="signed-out"><Navigate to="/sign-in" replace/></Show></>}
function NotFound(){return <Shell><Meta title="Page not found" description="This page isn't part of the Connect Sphere."/><section className="not-found"><span className="eyebrow">404 · WRONG FREQUENCY</span><h1 className="display">This track<br/>isn't here.</h1><p>The page may have moved, or the URL may be out of tune.</p><ButtonLink href="/">Return to the beginning</ButtonLink></section></Shell>}
function RoutedErrorBoundary({children}:{children:ReactNode}){const location=useRouterLocation();return <ErrorBoundary resetKey={`${location.pathname}${location.search}`}>{children}</ErrorBoundary>}
function ProductDetailRoute(){const {slug}=useParams();return <Shell><ProductDetail slug={slug||''}/></Shell>}
function ArticleDetailRoute({news=false}:{news?:boolean}){const {slug}=useParams();return <Shell><ArticleDetail slug={slug||''}/></Shell>}
function Router() {
  return <RoutedErrorBoundary><Routes>
   <Route path="/" element={<Shell><Home/></Shell>}/>
   <Route path="/sign-in/*" element={<SignInPage/>}/><Route path="/sign-up/*" element={<SignUpPage/>}/>
   <Route path="/products" element={<Shell><ProductIndex/></Shell>}/>
   <Route path="/products/laneucap-daw" element={<Shell><DawProductPage/></Shell>}/><Route path="/products/laneucap-plugins" element={<Shell><ConceptPage kind="plugins"/></Shell>}/><Route path="/products/audio-tools" element={<Shell><ConceptPage kind="tools"/></Shell>}/>
   <Route path="/store" element={<Shell><Store/></Shell>}/><Route path="/store/:slug" element={<ProductDetailRoute/>}/>
   <Route path="/cart" element={<Shell><CartPage/></Shell>}/><Route path="/downloads" element={<Shell><Downloads/></Shell>}/>
   <Route path="/learn" element={<Shell><ArticleIndex/></Shell>}/><Route path="/learn/:slug" element={<ArticleDetailRoute/>}/>
   <Route path="/news" element={<Shell><ArticleIndex news/></Shell>}/><Route path="/news/:slug" element={<ArticleDetailRoute news/>}/>
   <Route path="/support" element={<Shell><Support/></Shell>}/><Route path="/about" element={<Shell><About/></Shell>}/><Route path="/my-sphere" element={<ProtectedAccount/>}/><Route path="/admin/catalog" element={<ProtectedAdmin/>}/>
   <Route path="*" element={<NotFound/>}/>
  </Routes></RoutedErrorBoundary>
}
function ClerkQueryClientCacheInvalidator(){const {addListener}=useClerk();const prev=useMemo(()=>({current:undefined as string|null|undefined}),[]);useEffect(()=>addListener((state:{user?:{id:string}|null})=>{const id=state.user?.id??null;if(prev.current!==undefined&&prev.current!==id)queryClient.clear();prev.current=id}),[addListener,prev]);return null;}
function ClerkRoutes(){const navigate=useNavigate();return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={appearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{signIn:{start:{title:'Welcome back',subtitle:'Sign in to access your Connect Sphere'}},signUp:{start:{title:'Create your account',subtitle:'A place for your Connect Sphere activity'}}}} routerPush={(to:string)=>navigate(stripBase(to))} routerReplace={(to:string)=>navigate(stripBase(to),{replace:true})}><QueryClientProvider client={queryClient}><TooltipProvider><ClerkQueryClientCacheInvalidator/><Router/><Toaster/></TooltipProvider></QueryClientProvider></ClerkProvider>}
function App(){const [lines,setLines]=useState<CartLine[]>([]);const cart=useMemo<CartContextValue>(()=>({lines,add:(product)=>{if(product.status!=='available'||product.priceCents===null)return;setLines(prev=>{const existing=prev.find(l=>l.product.id===product.id);return existing?prev.map(l=>l.product.id===product.id?{...l,quantity:l.quantity+1}:l):[...prev,{product,quantity:1}]})},remove:id=>setLines(prev=>prev.filter(l=>l.product.id!==id)),clear:()=>setLines([])}),[lines]);return <BrowserRouter basename={basePath||undefined}><CartContext.Provider value={cart}><ClerkRoutes/></CartContext.Provider></BrowserRouter>}
export default App;
