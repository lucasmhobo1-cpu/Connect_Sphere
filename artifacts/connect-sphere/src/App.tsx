import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, Show, SignIn, SignUp, UserProfile, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ArrowDownRight, ArrowLeft, ArrowRight, AudioLines, ChevronDown, CircleHelp, Menu, Music2, Search, ShoppingBag, X } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  useCreateSupportRequest, useGetAccountOverview, useGetArticle, useGetProduct,
  useListAdminProducts, useUpdateAdminProduct,
  useListArticles, useListProducts, useListReleases, useSubscribeNewsletter,
  getListProductsQueryKey, getGetProductQueryKey, getListArticlesQueryKey,
  getGetArticleQueryKey, getListReleasesQueryKey, getGetAccountOverviewQueryKey,
  getListAdminProductsQueryKey,
  type AdminProduct, type Product, type Article, type Release,
} from '@workspace/api-client-react';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';

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
  function submit(e: FormEvent) { e.preventDefault(); newsletter.mutate({ data: { email } }, { onSuccess: r => { setNotice(r.message || 'You are on the list.'); setEmail(''); }, onError: () => setNotice('We could not save your email. Please try again.') }); }
  return <footer className="footer">
    <div className="footer-main"><div className="footer-brand"><Logo inverse/><p>Making room for the next sound.<br/>Tools and knowledge for people who make music.</p></div>
      <div><span className="footer-label">EXPLORE</span>{navLinks.slice(0,4).map(([l,h])=><Link key={h} href={h}>{l}</Link>)}<Link href="/products/laneucap-daw">LaneuCap DAW</Link><Link href="/products/laneucap-plugins">LaneuCap Plugins</Link><Link href="/products/audio-tools">Audio tools</Link><Link href="/downloads">Downloads</Link></div>
      <div><span className="footer-label">COMPANY</span><Link href="/about">About Huskagent</Link><Link href="/support">Contact & support</Link><Link href="/my-sphere">My Sphere</Link><Link href="/sign-in">Sign in</Link><Link href="/sign-up">Create account</Link></div>
      <form className="newsletter" onSubmit={submit}><span className="footer-label">NOTES FROM THE STUDIO</span><p>Occasional product notes, ideas, and useful things. Never noise.</p><div className="newsletter-field"><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your email address" aria-label="Email address" data-testid="input-newsletter-email"/><button disabled={newsletter.isPending} aria-label="Subscribe" data-testid="button-newsletter-submit"><ArrowRight size={17}/></button></div>{notice&&<small role="status" data-testid="status-newsletter">{notice}</small>}</form>
    </div><div className="footer-bottom"><span>© {new Date().getFullYear()} Huskagent Technology Company</span><span>Built for the sound that is yours.</span><a href="mailto:hello@connectsphere.audio">hello@connectsphere.audio</a></div>
  </footer>;
}
function Shell({ children }: { children: ReactNode }) { return <div className="grain"><Header/><main>{children}</main><Footer/></div>; }
function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) { return <div className="section-heading"><span className="eyebrow">{eyebrow}</span><h2 className="display">{title}</h2>{text&&<p>{text}</p>}</div>; }
function ButtonLink({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) { return <Link href={href} className={`button-link ${secondary ? 'button-outline' : ''}`}>{children}<ArrowRight size={16}/></Link>; }
function LoadingState({ label = 'Tuning the signal…' }: { label?: string }) { return <div className="state-box" role="status"><div className="skeleton-bar"/><div className="skeleton-bar short"/><span>{label}</span></div>; }
function ErrorState({ retry }: { retry: () => void }) { return <div className="state-box"><CircleHelp size={28}/><h3>We lost the thread.</h3><p>The request did not come through. Give it another try.</p><button className="text-button" onClick={retry}>Try again <ArrowRight size={15}/></button></div>; }
function ProductTile({ product, index = 0 }: { product: Product; index?: number }) {
  const { add } = useCart();
  const canAdd = product.status === 'available' && product.priceCents !== null;
  return <article className={`product-tile tile-${index%3}`} data-testid={`card-product-${product.id}`}>
    <Link href={`/store/${product.slug}`} className="tile-art" data-testid={`link-product-${product.id}`}>
      {product.coverImageUrl ? <img src={product.coverImageUrl} alt="" loading="lazy"/> : <div className="abstract-art"><div className="art-rings"/><span>{product.kind === 'daw' ? 'LC' : product.kind === 'plugin' ? 'CS' : 'AUDIO'}</span><small>CONCEPT / {product.category.toUpperCase()}</small></div>}
      <span className={`status-pill ${product.status === 'available' ? 'is-live' : ''}`}>{product.status === 'available' ? 'Available' : 'In development'}</span>
    </Link>
    <div className="tile-copy"><div><span className="eyebrow">{product.category.replaceAll('-', ' ')}</span><h3 className="display">{product.name}</h3><p>{product.shortDescription}</p></div>
      <div className="tile-bottom"><strong>{product.priceCents !== null ? new Intl.NumberFormat('en-US',{style:'currency',currency:product.currency || 'USD'}).format(product.priceCents/100) : 'In development'}</strong><Link href={`/store/${product.slug}`} aria-label={`Explore ${product.name}`} className="round-arrow" data-testid={`button-explore-product-${product.id}`}><ArrowRight size={17}/></Link></div>
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
  const featured = (products.data || []).slice(0,3);
  return <><Meta title="Make room for your sound" description="Connect Sphere is an independent music technology company building thoughtful tools for producers and creators."/>
    <section className="hero"><div className="hero-photo"/><div className="hero-vignette"/><div className="hero-glow"/><div className="hero-content reveal"><span className="eyebrow gold">A SOUND ALL YOUR OWN</span><h1 className="display">Make room<br/>for <em>your</em> sound.</h1><p>Tools and ideas for the people shaping what comes next. From Huskagent Technology Company.</p><div className="hero-actions"><ButtonLink href="/products">Explore the work</ButtonLink><Link href="/about" className="hero-text-link">A little about us <ArrowDownRight size={17}/></Link></div></div><div className="hero-index mono">01 / 04 <span>CONNECT SPHERE</span></div><div className="hero-side-note mono">LISTEN CLOSELY<br/>THEN MAKE IT YOURS</div></section>
    <section className="intro-section"><div className="intro-index mono">01—OUR POINT OF VIEW</div><div className="intro-copy"><span className="eyebrow">MADE FOR MAKING</span><h2 className="display">Good tools get out<br/>of the <i>way.</i></h2><p>We believe the best technology doesn't tell you what to make. It gives you a little more space, a little more clarity, and the confidence to follow an idea where it wants to go.</p><ButtonLink href="/about" secondary>Meet Connect Sphere</ButtonLink></div><div className="intro-mark" aria-hidden="true"><span className="orbit orbit-one"/><span className="orbit orbit-two"/><span className="orbit-core">CS</span></div></section>
    <section className="home-products"><div className="content-wrap"><div className="split-heading"><SectionHeading eyebrow="THE TOOLBOX, TAKING SHAPE" title="Work in progress." text="A growing family of music-making tools. LaneuCap is in development; feature explorations shown here are concepts, not released software."/><ButtonLink href="/products" secondary>All product areas</ButtonLink></div><ProductGrid products={featured} loading={products.isLoading} error={products.isError} retry={()=>products.refetch()}/></div></section>
    <section className="laneucap-feature"><div className="laneu-copy"><span className="eyebrow gold">IN DEVELOPMENT · CONCEPT ARTWORK</span><h2 className="display">LaneuCap<br/><i>DAW</i></h2><p>A fresh canvas for sound. LaneuCap is an in-development digital audio workstation concept from Connect Sphere. The interface below is illustrative artwork—not a working application or a downloadable build.</p><ButtonLink href="/products/laneucap-daw">Explore the concept</ButtonLink></div><DawConcept/></section>
    <section className="journal-section"><div className="content-wrap"><div className="split-heading"><SectionHeading eyebrow="FIELD NOTES" title="Ideas for the in-between." text="Process, perspective, and practical notes from people who make things."/><ButtonLink href="/learn" secondary>Visit the journal</ButtonLink></div><ArticleGrid articles={(articles.data||[]).slice(0,3)} loading={articles.isLoading} error={articles.isError} retry={()=>articles.refetch()} /></div></section>
    <section className="manifesto"><span className="eyebrow">A BETTER KIND OF LOUD</span><p className="display">“The point is not to sound like us.<br/><i>The point is to sound like you.</i>”</p><span className="mono">CONNECT SPHERE / EST. FOR WHAT'S NEXT</span></section>
    <NewsletterBand/>
  </>;
}
function DawConcept() {
  return <div className="daw-window" aria-label="LaneuCap digital audio workstation concept artwork"><div className="daw-top"><span className="daw-logo">L<span>∿</span></span><span>LANEUCAP · SESSION 04</span><span className="daw-top-right">CONCEPT ARTWORK <i/></span></div><div className="daw-toolbar"><span>FILE</span><span>EDIT</span><span>VIEW</span><span>SESSION</span><span className="daw-tempo">124.00 BPM <b>4/4</b></span></div><div className="daw-body"><aside className="daw-sidebar"><span className="daw-side-title">TRACKS</span>{['DRUM BUS','SUB / LOW','SYNTH 01','FIELD TAPE','VOX SKETCH'].map((n,i)=><div className="daw-track" key={n}><i style={{background:['#d5a342','#7f8b78','#ac7860','#72818a','#a5886b'][i]}}/><span>{n}</span><small>{String(i+1).padStart(2,'0')}</small></div>)}</aside><div className="daw-timeline"><div className="timeline-ruler">{['01','02','03','04','05','06','07','08','09'].map(v=><span key={v}>{v}</span>)}</div>{[0,1,2,3,4].map((n)=><div className="lane" key={n}><div className={`clip clip-${n}`}><span>{['drum loop / 02','sub texture','warm keys','street air','voice note'][n]}</span>{n===0&&<div className="waveform">{Array.from({length:48},(_,i)=><i key={i} style={{height:`${18+Math.abs(Math.sin(i*1.4))*52}%`}}/>)}</div>}</div></div>)}</div></div><div className="daw-footer"><span>◉ 00:42:18</span><span>MASTER OUT</span><div className="meter"><i/></div><span>44.1 kHz · STEREO</span></div><div className="concept-stamp">PLANNED CONCEPT · NOT A BUILD</div></div>;
}
function LaneuCapWordmark() {
  return <div className="laneu-wordmark" aria-label="LaneuCap DAW" data-testid="brand-laneucap">
    <span className="laneu-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M10 7v33h16" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="square"/><path d="M18 30v-7m6 11V14m6 20V20m6 11v-7" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round"/><path d="M7 43h34" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></span>
    <span><b>LaneuCap</b><small>DAW · CONNECT SPHERE</small></span>
  </div>;
}
function NewsletterBand() { const [email,setEmail]=useState('');const [msg,setMsg]=useState('');const sub=useSubscribeNewsletter();return <section className="newsletter-band"><div><span className="eyebrow">STAY IN THE LOOP</span><h2 className="display">Good things take<br/><i>listening.</i></h2></div><form onSubmit={e=>{e.preventDefault();sub.mutate({data:{email}},{onSuccess:r=>{setMsg(r.message||'Thanks for listening.');setEmail('')},onError:()=>setMsg('Could not save your email. Please try again.')})}}><label htmlFor="band-email">An occasional note from our studio.</label><div className="newsletter-field light"><input id="band-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" data-testid="input-home-newsletter"/><button disabled={sub.isPending} aria-label="Subscribe to notes" data-testid="button-home-newsletter"><ArrowRight size={18}/></button></div>{msg&&<small role="status" data-testid="status-home-newsletter">{msg}</small>}</form></section>; }

function ProductIndex({ category }: { category?: string }) {
  const [search,setSearch]=useState('');
  const params = useMemo(()=>({ ...(search ? {search} : {}), ...(category ? {category: category as never} : {}) }),[search,category]);
  const q=useListProducts(params,{query:{queryKey:getListProductsQueryKey(params)}});
  const title=category==='daw'?'LaneuCap DAW':category==='plugin'?'LaneuCap Plugins':'Audio tools';
  return <><Meta title={category ? title : 'Products'} description="Explore the developing product family from Connect Sphere."/><PageHero kicker="THE CONNECT SPHERE TOOLBOX" title={category ? title : 'Tools for the next sound.'} sub="Designed around the creative moment. Everything here is in development unless a product is explicitly marked available."/>
    <section className="catalog content-wrap"><div className="concept-links product-areas"><ButtonLink href="/products/laneucap-daw" secondary>LaneuCap DAW</ButtonLink><ButtonLink href="/products/laneucap-plugins" secondary>LaneuCap plugins</ButtonLink><ButtonLink href="/products/audio-tools" secondary>Audio tools</ButtonLink></div><div className="catalog-tools"><label className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search the collection" aria-label="Search products" data-testid="input-product-search"/></label><span className="mono">{q.data?.length ?? '—'} ITEMS</span></div><ProductGrid products={q.data} loading={q.isLoading} error={q.isError} retry={()=>q.refetch()}/></section></>;
}
function PageHero({ kicker,title,sub }: {kicker:string;title:string;sub:string}) { return <section className="page-hero"><span className="eyebrow">{kicker}</span><h1 className="display">{title}</h1><p>{sub}</p></section>; }
function ConceptPage({kind}:{kind:'daw'|'plugins'|'tools'}) {
  const content = {
    daw:{eyebrow:'LANEUCAP · DIGITAL AUDIO WORKSTATION',title:'A studio in your own shape.',description:'LaneuCap is an in-development DAW concept from Connect Sphere. We are exploring a thoughtful workspace for the entire journey from first idea to finished track.',label:'DAW CONCEPT'},
    plugins:{eyebrow:'LANEUCAP · PLUGINS',title:'Small details. Big feeling.',description:'A developing collection of plugin concepts for shaping tone, space, and movement. Product features, formats, and compatibility have not been verified or released.',label:'PLUGIN CONCEPTS'},
    tools:{eyebrow:'AUDIO TOOLS',title:'Useful, by design.',description:'An evolving set of ideas for the everyday work around music. Specific tools and capabilities are still being explored.',label:'IN DEVELOPMENT'},
  }[kind];
   return <><Meta title={content.title} description={content.description}/><section className="concept-hero"><div>{kind==='daw'&&<LaneuCapWordmark/>}<span className="eyebrow gold">{content.eyebrow}</span><h1 className="display">{content.title}</h1><p>{content.description}</p><span className="status-pill">{content.label}</span></div>{kind==='daw'?<DawConcept/>:<div className="concept-poster"><div className="poster-lines"/><span className="mono">{content.label}</span><b className="display">{kind==='plugins'?'LC / FX':'CS / AUDIO'}</b><small>CONCEPT STUDY — 2025</small></div>}</section><section className="content-wrap concept-disclaimer"><span className="eyebrow">A NOTE ON AVAILABILITY</span><h2 className="display">Ideas first. Claims later.</h2><p>LaneuCap is in development. This page and its interface imagery are concept artwork only. No executable, plugin, release, license, supported operating system, or purchasable version is currently confirmed here.</p><div className="concept-links"><ButtonLink href="/downloads" secondary>Release information</ButtonLink><ButtonLink href="/support" secondary>Ask us a question</ButtonLink></div></section><NewsletterBand/></>;
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
  return <><Meta title={p.name} description={p.shortDescription}/><section className="detail-hero"><div className="detail-art">{p.coverImageUrl?<img src={p.coverImageUrl} alt={`${p.name} artwork`}/>:<div className="abstract-art large"><div className="art-rings"/><span>{p.kind==='daw'?'LC':'CS'}</span><small>CONNECT SPHERE / PRODUCT CONCEPT</small></div>}</div><div className="detail-copy"><Link href="/store" className="back-link"><ArrowLeft size={15}/> All products</Link><span className="eyebrow">{p.category.replaceAll('-',' ')} · {p.kind}</span><h1 className="display">{p.name}</h1><p className="detail-lede">{p.shortDescription}</p><p>{p.description}</p><div className="detail-meta"><span className="status-pill">{p.status==='available'?'Available':'In development'}</span>{p.version&&<span className="mono">VERSION {p.version}</span>}</div>{p.featureTags?.length>0&&<div className="tags">{p.featureTags.map(t=><span key={t}>{t}</span>)}</div>}{available?<><strong className="detail-price">{new Intl.NumberFormat('en-US',{style:'currency',currency:p.currency||'USD'}).format(p.priceCents!/100)}</strong><button className="button-link" onClick={()=>add(p)} data-testid="button-add-to-cart">Add to bag <ShoppingBag size={16}/></button></>:<div className="availability-note">No purchase or download is available for this item at this time.</div>}</div></section><section className="content-wrap detail-bottom"><div><span className="eyebrow">THE HONEST VERSION</span><h2 className="display">Still taking shape.</h2></div><p>{p.status==='available'?'This product is listed as available by our catalogue. Confirm the details shown above before proceeding.':'This listing describes a product in development. Images and descriptions may represent plans rather than shipping functionality. No release file or license is available unless explicitly shown.'}</p><ButtonLink href="/support" secondary>Questions? Contact us</ButtonLink></section></>;
}
function CartPage() {
  const {lines,remove}=useCart();const total=lines.reduce((n,l)=>n+(l.product.priceCents||0)*l.quantity,0);
  return <><Meta title="Your bag" description="Your Connect Sphere bag."/><PageHero kicker="YOUR BAG" title="A little room for good things." sub="Your bag only includes products marked available with a listed price."/><section className="content-wrap cart-area">{lines.length===0?<div className="empty-state cart-empty"><ShoppingBag size={32}/><h2 className="display">Your bag is quiet.</h2><p>There are no purchasable products in it yet.</p><ButtonLink href="/store">Browse the store</ButtonLink></div>:<><div className="cart-lines">{lines.map(({product,quantity})=><article className="cart-line" key={product.id}><div className="cart-thumb"><AudioLines/></div><div><h2>{product.name}</h2><p>{product.shortDescription}</p><span className="mono">QTY {quantity}</span></div><strong>{new Intl.NumberFormat('en-US',{style:'currency',currency:product.currency||'USD'}).format((product.priceCents||0)*quantity/100)}</strong><button className="text-button" onClick={()=>remove(product.id)} data-testid={`button-remove-cart-${product.id}`}>Remove</button></article>)}</div><aside className="cart-summary"><span className="eyebrow">ORDER SUMMARY</span><div><span>Subtotal</span><b>{new Intl.NumberFormat('en-US',{style:'currency',currency:lines[0]?.product.currency||'USD'}).format(total/100)}</b></div><p>Taxes and any applicable fees are calculated by a payment provider. No payment provider is connected, so checkout is unavailable.</p><button className="button-link disabled" disabled data-testid="button-checkout-disabled">Checkout unavailable <ShoppingBag size={16}/></button><button className="text-button" onClick={()=>lines.forEach(l=>remove(l.product.id))} data-testid="button-clear-cart">Clear bag</button></aside></>}</section></>;
}
function Downloads() {
  const q=useListReleases(undefined,{query:{queryKey:getListReleasesQueryKey()}});
  return <><Meta title="Downloads" description="Official Connect Sphere release availability and downloads."/><PageHero kicker="RELEASES & DOWNLOADS" title="Only what is ready." sub="A file appears here only when a real release is configured and the API confirms it is available."/><section className="content-wrap downloads-area">{q.isLoading?<LoadingState label="Checking release availability…"/>:q.isError?<ErrorState retry={()=>q.refetch()}/>:!q.data?.length?<div className="empty-state"><AudioLines size={32}/><h2 className="display">No releases yet.</h2><p>LaneuCap is in development. There are no configured release files available to download.</p></div>:<div className="release-list">{q.data.map((r:Release)=><article key={r.id} className="release-row" data-testid={`card-release-${r.id}`}><div><span className="eyebrow">{r.productName} · {r.platform}</span><h2 className="display">Version {r.version}</h2><p>{r.releaseNotes}</p><small>{r.systemRequirements}</small></div><div className="release-action">{r.downloadAvailable?<a className="button-link" href={`/api/releases/${r.id}/download`} data-testid={`link-download-${r.id}`}>Download release <ArrowDownRight size={16}/></a>:<span className="status-pill">No file configured</span>}{r.fileSizeBytes&&<small>{(r.fileSizeBytes/1048576).toFixed(1)} MB</small>}</div></article>)}</div>}</section></>;
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
      <label>Availability<select value={status} onChange={event => setStatus(event.target.value as AdminProduct['status'])} aria-label={`Availability for ${product.name}`} data-testid={`select-admin-status-${product.id}`}><option value="coming_soon">In development</option><option value="available">Available</option><option value="discontinued">Discontinued</option></select></label>
      <label className="admin-publish"><input type="checkbox" checked={published} onChange={event => setPublished(event.target.checked)} data-testid={`checkbox-admin-publish-${product.id}`}/> Published</label>
      <button className="button-link" type="submit" disabled={update.isPending} data-testid={`button-admin-save-${product.id}`}>{update.isPending ? 'Saving…' : 'Save settings'} <ArrowRight size={15}/></button>
      {notice && <small className={notice.includes('Could not') || notice.startsWith('Enter') ? 'form-error' : 'form-success'} role="status">{notice}</small>}
    </form>
  </article>;
}
function AdminCatalog() {
  const q = useListAdminProducts({ query: { queryKey: getListAdminProductsQueryKey() } });
  return <><Meta title="Catalog administration" description="Manage Connect Sphere product prices and publication state."/><PageHero kicker="ADMINISTRATION" title="Product catalogue." sub="Configure product prices, availability, and storefront visibility. This does not process payments or configure release files."/><section className="content-wrap admin-catalog">
    {q.isLoading ? <LoadingState label="Loading product settings…"/> : q.isError ? <div className="admin-denied"><h2 className="display">Administrator access required.</h2><p>This area is limited to accounts assigned the administrator role. If you are an administrator, reload or try again.</p><button className="text-button" onClick={() => q.refetch()}>Try again</button></div> : !q.data?.length ? <div className="empty-state"><h2 className="display">No products to manage.</h2></div> : q.data.map(product => <AdminProductEditor key={product.id} product={product}/>)}
  </section></>;
}
function Support() {
 const [search,setSearch]=useState('');const [filter,setFilter]=useState('all');
 const [notice,setNotice]=useState('');const request=useCreateSupportRequest();
 const faq=[{cat:'products',q:'Is LaneuCap available to download?',a:'No. LaneuCap is in development and there is no configured release file. The interface imagery on the site is concept artwork only.'},{cat:'products',q:'Which operating systems will be supported?',a:'Compatibility has not been confirmed. We will publish verified platform details alongside a real release.'},{cat:'downloads',q:'Where can I find product downloads?',a:'A download link is shown only when the release API explicitly confirms that a real file is available.'},{cat:'account',q:'How do I access My Sphere?',a:'Use the sign-in link and complete authentication through our managed Clerk provider. Account pages require a real signed-in session.'},{cat:'billing',q:'Can I purchase a product here?',a:'Only catalogue products marked available with a listed price may be placed in your bag. A real payment provider is not connected, so checkout is not available.'},{cat:'support',q:'How long does a reply take?',a:'Your request is saved to our support system. A response timeline is not currently guaranteed.'}];
 const filtered=faq.filter(f=>(filter==='all'||f.cat===filter)&&(`${f.q} ${f.a}`).toLowerCase().includes(search.toLowerCase()));
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;const fd=new FormData(form);request.mutate({data:{name:String(fd.get('name')),email:String(fd.get('email')),category:String(fd.get('category')) as never,subject:String(fd.get('subject')),message:String(fd.get('message'))}},{onSuccess:r=>{setNotice(`Request #${r.id} received. ${r.message}`);form.reset()},onError:()=>setNotice('Your request could not be submitted. Please try again.')});}
 return <><Meta title="Support" description="Find answers or send a support request to Connect Sphere."/><PageHero kicker="WE'RE LISTENING" title="How can we help?" sub="Find a quick answer or send a note to the people behind Connect Sphere."/><section className="support-layout content-wrap"><div className="faq-side"><span className="eyebrow">COMMON QUESTIONS</span><label className="search-box faq-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search answers" data-testid="input-faq-search"/></label><div className="category-chips">{['all','products','downloads','account','billing','support'].map(c=><button key={c} className={filter===c?'chip active':'chip'} onClick={()=>setFilter(c)} data-testid={`button-faq-filter-${c}`}>{c}</button>)}</div><div className="faq-list">{filtered.map((f,i)=><details key={f.q} className="faq-item"><summary data-testid={`faq-question-${i}`}>{f.q}<ChevronDown size={17}/></summary><p>{f.a}</p></details>)}{!filtered.length&&<p className="muted">No answer matched. Send us a note and we will take a look.</p>}</div></div><form className="support-form" onSubmit={submit}><span className="eyebrow">SEND A REQUEST</span><h2 className="display">A human is on the other end.</h2><p>Give us a little context. Required fields are marked.</p><label>Your name<input name="name" required maxLength={120} data-testid="input-support-name"/></label><label>Email address<input name="email" type="email" required maxLength={254} data-testid="input-support-email"/></label><label>Topic<select name="category" required data-testid="select-support-category"><option value="other">Something else</option><option value="product">Product question</option><option value="downloads">Downloads</option><option value="account-license">Account or license</option><option value="billing">Billing</option></select></label><label>Subject<input name="subject" required minLength={3} maxLength={160} data-testid="input-support-subject"/></label><label>How can we help?<textarea name="message" required minLength={10} maxLength={5000} rows={5} data-testid="input-support-message"/></label><button className="button-link" disabled={request.isPending} data-testid="button-support-submit">{request.isPending?'Sending…':'Send request'} <ArrowRight size={16}/></button>{notice&&<p className={request.isError?'form-error':'form-success'} role="status" data-testid="status-support">{notice}</p>}</form></section></>;
}
function About() { return <><Meta title="About Huskagent Technology" description="The company behind Connect Sphere and LaneuCap."/><PageHero kicker="HUSKAGENT TECHNOLOGY COMPANY" title="Independent by nature." sub="Connect Sphere is a music technology brand built around one simple belief: the tools should make more room for the person using them."/><section className="about-story content-wrap"><div className="about-column"><span className="eyebrow">OUR NORTH STAR</span><h2 className="display">Technology with a human center.</h2><p>We are building a considered home for music-making tools, resources, and the people who care about sound. Not more noise. More useful possibility.</p></div><div className="about-column offset"><span className="eyebrow">WHAT WE'RE DOING</span><h2 className="display">Start with listening.</h2><p>LaneuCap is an early product in development. We share our direction openly, and we will be just as clear about what is not ready yet. No speculative download buttons. No compatibility claims without proof.</p><ButtonLink href="/products">Explore product areas</ButtonLink></div><div className="about-quote"><div className="orbit orbit-one"/><span className="display">“Make the technology feel like an invitation.”</span></div></section><NewsletterBand/></>; }
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
function ProtectedAccount(){return <><Show when="signed-in"><Shell><MySphere/></Shell></Show><Show when="signed-out"><Redirect to="/sign-in"/></Show></>}
function ProtectedAdmin(){return <><Show when="signed-in"><Shell><AdminCatalog/></Shell></Show><Show when="signed-out"><Redirect to="/sign-in"/></Show></>}
function NotFound(){return <Shell><Meta title="Page not found" description="This page isn't part of the Connect Sphere."/><section className="not-found"><span className="eyebrow">404 · WRONG FREQUENCY</span><h1 className="display">This track<br/>isn't here.</h1><p>The page may have moved, or the URL may be out of tune.</p><ButtonLink href="/">Return to the beginning</ButtonLink></section></Shell>}
function RoutedErrorBoundary({children}:{children:ReactNode}){const [location]=useLocation();return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>}
function Router() {
 return <RoutedErrorBoundary><Switch>
  <Route path="/"><Shell><Home/></Shell></Route>
  <Route path="/sign-in/*?" component={SignInPage}/><Route path="/sign-up/*?" component={SignUpPage}/>
  <Route path="/products"><Shell><ProductIndex/></Shell></Route>
  <Route path="/products/laneucap-daw"><Shell><ConceptPage kind="daw"/></Shell></Route><Route path="/products/laneucap-plugins"><Shell><ConceptPage kind="plugins"/></Shell></Route><Route path="/products/audio-tools"><Shell><ConceptPage kind="tools"/></Shell></Route>
  <Route path="/store"><Shell><Store/></Shell></Route>
  <Route path="/store/:slug">{p=><Shell><ProductDetail slug={p.slug}/></Shell>}</Route>
  <Route path="/cart"><Shell><CartPage/></Shell></Route><Route path="/downloads"><Shell><Downloads/></Shell></Route>
  <Route path="/learn"><Shell><ArticleIndex/></Shell></Route><Route path="/learn/:slug">{p=><Shell><ArticleDetail slug={p.slug}/></Shell>}</Route>
  <Route path="/news"><Shell><ArticleIndex news/></Shell></Route><Route path="/news/:slug">{p=><Shell><ArticleDetail slug={p.slug}/></Shell>}</Route>
  <Route path="/support"><Shell><Support/></Shell></Route><Route path="/about"><Shell><About/></Shell></Route><Route path="/my-sphere" component={ProtectedAccount}/><Route path="/admin/catalog" component={ProtectedAdmin}/>
  <Route component={NotFound}/>
 </Switch></RoutedErrorBoundary>
}
function ClerkQueryClientCacheInvalidator(){const {addListener}=useClerk();const prev=useMemo(()=>({current:undefined as string|null|undefined}),[]);useEffect(()=>addListener((state:{user?:{id:string}|null})=>{const id=state.user?.id??null;if(prev.current!==undefined&&prev.current!==id)queryClient.clear();prev.current=id}),[addListener,prev]);return null;}
function ClerkRoutes(){const [,setLocation]=useLocation();return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={appearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{signIn:{start:{title:'Welcome back',subtitle:'Sign in to access your Connect Sphere'}},signUp:{start:{title:'Create your account',subtitle:'A place for your Connect Sphere activity'}}}} routerPush={(to:string)=>setLocation(stripBase(to))} routerReplace={(to:string)=>setLocation(stripBase(to),{replace:true})}><QueryClientProvider client={queryClient}><TooltipProvider><ClerkQueryClientCacheInvalidator/><Router/><Toaster/></TooltipProvider></QueryClientProvider></ClerkProvider>}
function App(){const [lines,setLines]=useState<CartLine[]>([]);const cart=useMemo<CartContextValue>(()=>({lines,add:(product)=>{if(product.status!=='available'||product.priceCents===null)return;setLines(prev=>{const existing=prev.find(l=>l.product.id===product.id);return existing?prev.map(l=>l.product.id===product.id?{...l,quantity:l.quantity+1}:l):[...prev,{product,quantity:1}]})},remove:id=>setLines(prev=>prev.filter(l=>l.product.id!==id)),clear:()=>setLines([])}),[lines]);return <CartContext.Provider value={cart}><WouterRouter base={basePath}><ClerkRoutes/></WouterRouter></CartContext.Provider>}
export default App;
