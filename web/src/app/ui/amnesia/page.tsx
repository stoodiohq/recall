import {
  Header,
  Hero,
  Problem,
  Demo,
  HowItWorks,
  Trust,
  Pricing,
  FinalCTA,
  Footer,
} from './components';

export default function AmnesiaPage() {
  return (
    <>
      <a href="#main" className="am-skip-link">
        Skip to main content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <Problem />
        <Demo />
        <HowItWorks />
        <Trust />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
