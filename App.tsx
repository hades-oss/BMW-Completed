import { useState } from 'react'

const products = [
  { name: 'BMW Performance Oversized T-Shirt', price: '690.000₫', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=85', tag: 'NEW' },
  { name: 'BMW Training Shorts', price: '590.000₫', image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501aa?auto=format&fit=crop&w=900&q=85', tag: 'NEW' },
  { name: 'BMW Lifting Straps', price: '320.000₫', image: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=900&q=85', tag: 'ESSENTIAL' },
  { name: 'BMW Performance Gym Bag', price: '1.290.000₫', image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=900&q=85', tag: 'NEW' },
]

const tabProducts = {
  CLOTHING: ['Oversized T-Shirt', 'Compression Shirt', 'Training Shorts', 'Gym Joggers'],
  ACCESSORIES: ['Gym Bag', 'Lifting Straps', 'Training Gloves', 'Wrist Wraps'],
  EQUIPMENT: ['Resistance Bands', 'Ab Wheel', 'Push-up Handles', 'Adjustable Dumbbells'],
}

const icon = (name: string, className = 'w-5 h-5') => {
  const paths: Record<string, JSX.Element> = {
    search: <><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.2-5.4 7-5.4s6.2 1.8 7 5.4"/></>,
    heart: <path d="M20.8 5.9a5.4 5.4 0 0 0-7.7 0L12 7l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7L12 22l8.8-8.4a5.4 5.4 0 0 0 0-7.7Z"/>,
    bag: <><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
    arrow: <path d="M5 12h14M13 6l6 6-6 6"/>,
    menu: <><path d="M3 6h18M3 12h18M3 18h18"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7V2Z"/>,
  }
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function ProductCard({ product, simple = false }: { product: typeof products[number], simple?: boolean }) {
  const [liked, setLiked] = useState(false)
  const [added, setAdded] = useState(false)
  return <article className="product-card group">
    <div className="product-image">
      <img src={product.image} alt={product.name} />
      <span className="product-tag">{product.tag}</span>
      <button aria-label="Add to wishlist" onClick={() => setLiked(!liked)} className={`heart ${liked ? 'liked' : ''}`}>{icon('heart', 'w-4 h-4')}</button>
      {!simple && <button onClick={() => setAdded(true)} className="quick-add">{added ? 'ADDED' : 'ADD TO CART'}</button>}
    </div>
    <div className="product-copy"><h3>{product.name}</h3><div><span className="price">{product.price}</span><span className="rating">★ 4.8</span></div></div>
  </article>
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<keyof typeof tabProducts>('CLOTHING')
  const [cart, setCart] = useState(0)
  const addTabProduct = (name: string) => setCart((count) => count + 1)

  return <main className="site-shell">
    <div className="announcement"><span>FREE SHIPPING ON ORDERS OVER 1.500.000₫</span><span className="hidden sm:inline">BUILT FOR THE GRIND</span><span>30 DAYS EASY RETURNS</span></div>
    <header className="header">
      <button className="mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}>{icon(menuOpen ? 'close' : 'menu')}</button>
      <a href="#top" className="brand"><strong>B</strong><strong>M</strong><strong>W</strong><em>BODY / MIND / WILLPOWER</em></a>
      <nav className={menuOpen ? 'open' : ''}>
        {['SHOP', 'CLOTHING', 'ACCESSORIES', 'EQUIPMENT', 'NEW ARRIVALS', 'SALE'].map((item, i) => <a className={item === 'SALE' ? 'sale' : ''} key={item} href={i === 0 ? '#new' : '#shop'}>{item}{item === 'SHOP' && <span className="chevron">⌄</span>}</a>)}
      </nav>
      <div className="header-actions">
        <button aria-label="Search" onClick={() => setSearchOpen(!searchOpen)}>{icon('search')}</button>
        <button className="hide-mobile" aria-label="Account">{icon('user')}</button><button className="hide-mobile" aria-label="Wishlist">{icon('heart')}</button>
        <button aria-label="Shopping bag" className="bag" onClick={() => setCart(cart + 1)}>{icon('bag')}<i>{cart}</i></button>
      </div>
      {searchOpen && <div className="search-panel"><input autoFocus placeholder="Search products"/><button onClick={() => setSearchOpen(false)}>{icon('close')}</button></div>}
    </header>

    <section className="hero" id="top">
      <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1800&q=90" alt="Athlete lifting in a dark modern gym" />
      <div className="hero-wash"/><div className="hero-copy"><p className="eyebrow">EST. FOR THE OBSESSED</p><h1>BODY.<br/><i>MIND.</i><br/>WILLPOWER.</h1><p className="hero-sub">Train harder. Move stronger. Become better.</p><div className="cta-row"><a className="button pink" href="#new">SHOP NOW {icon('arrow')}</a><a className="button line" href="#shop">EXPLORE COLLECTION</a></div></div>
      <div className="hero-foot"><span>01 / 03</span><div className="progress"><i/></div><span>SCROLL TO EXPLORE ↓</span></div>
    </section>

    <section className="categories section" id="shop"><div className="section-title"><p className="eyebrow">SHOP THE SYSTEM</p><h2>SHOP BY<br/><i>CATEGORY.</i></h2><a href="#new">VIEW ALL {icon('arrow')}</a></div><div className="category-grid">
      {[['GYM CLOTHING','Built to move. Made to endure.','photo-1518611012118-696072aa579a'],['GYM ACCESSORIES','The details make the difference.','photo-1599058917212-d750089bc07e'],['WORKOUT EQUIPMENT','Your gym. Your rules.','photo-1581009146145-b5ef050c2e1e']].map(([title, sub, img], i) => <article className={`category c${i}`} key={title}><img src={`https://images.unsplash.com/${img}?auto=format&fit=crop&w=900&q=85`} alt={title}/><div><span>0{i + 1}</span><h3>{title}</h3><p>{sub}</p><a href="#new">SHOP NOW {icon('arrow')}</a></div></article>)}
    </div></section>

    <section className="grind"><div className="grind-image"><img src="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1200&q=85" alt="Athlete training with dumbbells"/></div><div className="grind-content"><p className="eyebrow">THE BMW STANDARD</p><h2>BUILT FOR<br/>THE <i>GRIND.</i></h2><p>Gear designed for training, movement and everyday performance. Because progress doesn't happen by accident.</p><a className="button pink" href="#new">SHOP COLLECTION {icon('arrow')}</a><div className="stat-line"><span><b>24/7</b> YOUR GRIND</span><span><b>100%</b> COMMITMENT</span></div></div></section>

    <section className="products section" id="new"><div className="section-top"><div><p className="eyebrow">JUST DROPPED</p><h2>NEW <i>ARRIVALS.</i></h2></div><div className="carousel-controls"><button>←</button><button>→</button></div></div><div className="product-grid">{products.map(product => <ProductCard key={product.name} product={product}/>)}</div></section>

    <section className="promo"><div><p className="eyebrow">NO EXCUSES. NO LIMITS.</p><h2>TRAIN.<br/><i>PUSH.</i> REPEAT.</h2><p>Everything you need to take your training further.</p><a className="button pink" href="#shop">SHOP BMW {icon('arrow')}</a></div><span className="promo-mark">BMW</span></section>

    <section className="best section"><div className="section-top"><div><p className="eyebrow">THE CROWD CHOSE</p><h2>BEST <i>SELLERS.</i></h2></div><a href="#shop" className="text-link">SHOP ALL {icon('arrow')}</a></div><div className="product-grid">{products.map((p, index) => <ProductCard simple key={p.name} product={{...p, name: ['BMW Compression T-Shirt','BMW Training Gloves','BMW Lifting Belt','BMW Shaker / Gym Bottle'][index], tag: 'BEST SELLER'}}/>)}</div></section>

    <section className="why section"><div className="why-intro"><p className="eyebrow">THE DIFFERENCE</p><h2>WHY<br/><i>BMW?</i></h2><p>Not just apparel. A mindset you put on every time you show up.</p></div><div className="why-grid">{[[ '01','BUILT FOR TRAINING','Gear designed around real workouts.'],['02','MODERN DESIGN','Minimal and athletic by design.'],['03','QUALITY FIRST','Durable materials. Proven performance.'],['04','MADE FOR THE GRIND','For people who take training seriously.']].map(([n, title, text])=><article key={n}><span>{n}</span>{icon('bolt')}<h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section className="product-preview section"><div className="section-top"><div><p className="eyebrow">SHOP YOUR WAY</p><h2>THE <i>ESSENTIALS.</i></h2></div><div className="tabs">{Object.keys(tabProducts).map(t => <button className={activeTab === t ? 'active' : ''} key={t} onClick={() => setActiveTab(t as keyof typeof tabProducts)}>{t}</button>)}</div></div><div className="tab-grid">{tabProducts[activeTab].map((name, index)=><article key={name}><span>0{index+1}</span><div className="item-visual"><img src={products[index].image} alt={name}/><button onClick={() => addTabProduct(name)}>+</button></div><h3>BMW {name}</h3><p>From {['490.000₫','590.000₫','690.000₫','890.000₫'][index]}</p></article>)}</div></section>

    <section className="community"><div className="community-copy"><p className="eyebrow">THE BMW COLLECTIVE</p><h2>MORE THAN<br/><i>TRAINING.</i></h2><p>Body. Mind. Willpower.</p><a href="#newsletter" className="button line">JOIN THE COMMUNITY {icon('arrow')}</a></div><div className="collage"><img className="collage-one" src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=85" alt="Fitness community training"/><img className="collage-two" src="https://images.unsplash.com/photo-1581009137042-c552e485697a?auto=format&fit=crop&w=700&q=85" alt="Athlete in gym"/><span>YOUR<br/>BEST<br/>IS NEXT</span></div></section>

    <section className="newsletter" id="newsletter"><div><p className="eyebrow">STAY CONNECTED</p><h2>STAY IN<br/>THE <i>GRIND.</i></h2></div><form onSubmit={(e) => e.preventDefault()}><p>Get new drops, training inspiration and BMW updates.</p><div><input type="email" required placeholder="ENTER YOUR EMAIL"/><button>SUBSCRIBE {icon('arrow')}</button></div></form></section>
    <footer><div className="footer-head"><a className="brand" href="#top"><strong>B</strong><strong>M</strong><strong>W</strong><em>BODY / MIND / WILLPOWER</em></a><p>Made for those who show up.</p></div><div className="footer-links">{[['SHOP','Clothing','Accessories','Equipment','New Arrivals','Sale'],['CUSTOMER','Contact','Shipping','Returns','FAQ'],['BMW','About Us','Our Story','Community','Careers'],['FOLLOW US','Instagram','TikTok','Facebook','YouTube']].map(([heading, ...links])=><div key={heading}><h3>{heading}</h3>{links.map(l=><a href="#top" key={l}>{l}</a>)}</div>)}</div><div className="footer-bottom"><span>© 2026 BMW – BODY, MIND, WILLPOWER.</span><span>VIETNAM / VND</span><span>PRIVACY &nbsp; TERMS</span></div></footer>
  </main>
}
