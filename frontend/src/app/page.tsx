import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Zap, 
  Brain, 
  Lock, 
  ArrowRight, 
  CheckCircle2,
  Github,
  Twitter,
  Sparkles,
  Users,
  TrendingUp,
  Coins
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">VerifiAI</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition">
              How it Works
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition">
              Pricing
            </Link>
            <Link href="https://docs.verifiai.io" className="text-sm text-muted-foreground hover:text-foreground transition">
              Docs
            </Link>
          </nav>
          
          <div className="flex items-center space-x-4">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-6">
            <Sparkles className="w-3 h-3 mr-1" />
            Built on Aptos • Powered by Zero-Knowledge Proofs
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Trustless AI Verification
            <br />
            <span className="text-primary">for On-Chain Agents</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Generate and verify zero-knowledge proofs for AI inference. Build trustless AI agents for RWA settlements, content verification, and autonomous trading — all provable on the Aptos blockchain.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/sign-up">
              <Button size="xl" className="gap-2">
                Start Building <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="xl" className="gap-2">
                <Zap className="w-4 h-4" />
                Live Demo
              </Button>
            </Link>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t">
            <div>
              <div className="text-3xl font-bold">10K+</div>
              <div className="text-sm text-muted-foreground">Proofs Verified</div>
            </div>
            <div>
              <div className="text-3xl font-bold">&lt;1s</div>
              <div className="text-sm text-muted-foreground">Verification Time</div>
            </div>
            <div>
              <div className="text-3xl font-bold">500+</div>
              <div className="text-sm text-muted-foreground">Active Agents</div>
            </div>
            <div>
              <div className="text-3xl font-bold">$2M+</div>
              <div className="text-sm text-muted-foreground">Settlements Processed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for Verifiable AI
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From proof generation to on-chain verification, we've built the complete infrastructure for trustless AI agents.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-card p-6 rounded-xl border hover:shadow-lg transition">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Zero-Knowledge Proofs</h3>
              <p className="text-muted-foreground">
                Generate Groth16, Bulletproofs, or Hybrid proofs for AI inference without revealing sensitive data or model weights.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-card p-6 rounded-xl border hover:shadow-lg transition">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sub-Second Verification</h3>
              <p className="text-muted-foreground">
                Verify proofs on-chain in under 1 second using Aptos' parallel execution and native Move contracts.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-card p-6 rounded-xl border hover:shadow-lg transition">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Agent Swarms</h3>
              <p className="text-muted-foreground">
                Coordinate multiple AI agents with shared memory via Shelby Protocol for complex multi-agent tasks.
              </p>
            </div>
            
            {/* Feature 4 */}
            <div className="bg-card p-6 rounded-xl border hover:shadow-lg transition">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Coins className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">RWA Settlements</h3>
              <p className="text-muted-foreground">
                Execute real-world asset settlements with verified AI decisions. Trade invoices, real estate, and commodities trustlessly.
              </p>
            </div>
            
            {/* Feature 5 */}
            <div className="bg-card p-6 rounded-xl border hover:shadow-lg transition">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Photon Rewards</h3>
              <p className="text-muted-foreground">
                Earn PAT tokens for proof verifications and contributions. Embedded wallets make onboarding seamless.
              </p>
            </div>
            
            {/* Feature 6 */}
            <div className="bg-card p-6 rounded-xl border hover:shadow-lg transition">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Model Registry</h3>
              <p className="text-muted-foreground">
                Register and verify AI models on-chain. Track usage, ensure integrity, and prove model provenance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How VerifiAI Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From AI inference to on-chain verification in three simple steps.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary-foreground">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Run AI Inference</h3>
              <p className="text-muted-foreground">
                Your AI agent runs inference off-chain using any ML model (PyTorch, TensorFlow, ONNX). The result is computed privately.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary-foreground">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Generate ZK Proof</h3>
              <p className="text-muted-foreground">
                VerifiAI creates a cryptographic proof (~200 bytes) that the computation was done correctly, without revealing inputs or model weights.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary-foreground">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Verify On-Chain</h3>
              <p className="text-muted-foreground">
                Submit the proof to Aptos. Our Move smart contract verifies it in under 1 second. Actions execute automatically if valid.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built for Real-World Use Cases
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              VerifiAI powers trustless AI applications across finance, content, and autonomous systems.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-card p-8 rounded-xl border">
              <h3 className="text-xl font-semibold mb-4">🏦 Trade Finance & RWA</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <span>Verify AI pricing decisions for $500K+ settlements</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <span>Automated invoice factoring with proof requirements</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <span>Multi-party approval for real estate tokenization</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-card p-8 rounded-xl border">
              <h3 className="text-xl font-semibold mb-4">🤖 Autonomous Trading</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <span>Prove trading bot decisions are based on legitimate models</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <span>Audit trail for every AI-driven trade execution</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <span>Risk assessment with cryptographic guarantees</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-card p-8 rounded-xl border">
              <h3 className="text-xl font-semibold mb-4">🎨 Content & Royalties</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <span>Verify AI-generated content attribution and ownership</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <span>Automatic royalty distribution with proof of creation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <span>Deepfake detection with on-chain verification</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-card p-8 rounded-xl border">
              <h3 className="text-xl font-semibold mb-4">🗳️ AI Governance</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <span>Verifiable voting recommendations from AI advisors</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <span>DAO proposal analysis with provable reasoning</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <span>Transparent AI-assisted decision making</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start free, scale as you grow. Pay only for what you use.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Tier */}
            <div className="bg-card p-8 rounded-xl border">
              <h3 className="text-xl font-semibold mb-2">Starter</h3>
              <div className="text-3xl font-bold mb-4">Free</div>
              <p className="text-muted-foreground mb-6">Perfect for testing and development</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>100 proofs/month</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>3 AI agents</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Testnet access</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Community support</span>
                </li>
              </ul>
              <Link href="/sign-up">
                <Button variant="outline" className="w-full">Get Started</Button>
              </Link>
            </div>
            
            {/* Pro Tier */}
            <div className="bg-card p-8 rounded-xl border-2 border-primary relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
              <h3 className="text-xl font-semibold mb-2">Pro</h3>
              <div className="text-3xl font-bold mb-4">$99<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
              <p className="text-muted-foreground mb-6">For production applications</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>10,000 proofs/month</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Unlimited agents</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Mainnet access</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Analytics dashboard</span>
                </li>
              </ul>
              <Link href="/sign-up?plan=pro">
                <Button className="w-full">Start Free Trial</Button>
              </Link>
            </div>
            
            {/* Enterprise Tier */}
            <div className="bg-card p-8 rounded-xl border">
              <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
              <div className="text-3xl font-bold mb-4">Custom</div>
              <p className="text-muted-foreground mb-6">For large-scale deployments</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Unlimited proofs</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Dedicated infrastructure</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Custom integrations</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>SLA guarantee</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>24/7 support</span>
                </li>
              </ul>
              <Link href="/contact">
                <Button variant="outline" className="w-full">Contact Sales</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Build Trustless AI?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Join hundreds of developers building the future of verifiable AI on Aptos. Start generating proofs in minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="xl" variant="secondary" className="gap-2">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="https://github.com/verifiai-protocol" target="_blank">
              <Button size="xl" variant="outline" className="gap-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                <Github className="w-4 h-4" />
                View on GitHub
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold">VerifiAI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Trustless AI verification for the on-chain economy.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features" className="hover:text-foreground">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
                <li><Link href="/docs" className="hover:text-foreground">Documentation</Link></li>
                <li><Link href="/demo" className="hover:text-foreground">Demo</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground">About</Link></li>
                <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-foreground">Careers</Link></li>
                <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="flex space-x-4">
                <Link href="https://twitter.com/verifiaiprotocol" target="_blank" className="text-muted-foreground hover:text-foreground">
                  <Twitter className="w-5 h-5" />
                </Link>
                <Link href="https://github.com/verifiai-protocol" target="_blank" className="text-muted-foreground hover:text-foreground">
                  <Github className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 VerifiAI Protocol. All rights reserved.
            </p>
            <div className="flex space-x-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
