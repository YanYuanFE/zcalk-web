'use client';
import { Header } from '@/components/Header';
import { BackgroundBeams } from '@/components/background-beams';
import { Footer } from '@/components/Footer';
import { Meteors } from '@/components/meteors';
import { ArrowRight } from '@/components/Icons';
import { useRouter } from 'next/navigation';
import { globalConfig } from '@/constants';
import { Button } from '@/components/ui/button';


export default function Home() {
  const router = useRouter();
  const handleClick = () => {
    router.push('/demo');
  };
  return (
    <main className="min-h-screen max-w-screen overflow-hidden bg-neutral-950">
      <Header />
      <section className="h-[40rem] w-full rounded-md relative flex flex-col items-center justify-center antialiased">
        <BackgroundBeams />
        <div className="max-w-2xl mx-auto p-4 text-center ">
          <h1 className="relative z-10 text-lg md:text-4xl  bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600  text-center font-sans font-bold">
          A distributed zk calculate framework for trustless verifiable calculation.
          </h1>
          <p></p>
          <p className="mt-12 mb-12 text-center text-lg tracking-tight text-gray-400 md:text-xl text-balance translate-y-[-1rem] animate-fade-in [--animation-delay:400ms]">
          ZCalK harnesses a network of distributed prover nodes to generate zero-knowledge proofs for anycalculations(such as AI computations). By leveraging the Stark and WASM-Cairo, we aim to bring unparalleled efficiency to on-chain verification.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleClick}
              className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring translate-y-[-1rem] animate-fade-in gap-1 rounded-lg opacity-0 ease-in-out [--animation-delay:600ms] h-10 px-4 py-2"
            >
              <span>Interactive Demo</span>
            </Button>
            <a
              href={globalConfig.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center translate-y-[-1rem] animate-fade-in gap-1 rounded-lg opacity-0 ease-in-out [--animation-delay:600ms] "
            >
              <Button
                variant={'outline'}
                className="rounded-md text-sm font-medium ring-offset-background transition-colors h-10 px-4 py-2"
              >
                Go to GitHub <ArrowRight />
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section className="w-full py-10">
      <div className="container px-4 md:px-6">
        <h2 className="text-3xl font-bold tracking-tighter sm:text-xl md:text-4xl mb-4 text-center">Run a node on Local Machine</h2>
        <p className="text-xl text-muted-foreground mb-8 text-center">
          Follow these steps to set up and run a node on your local machine:
        </p>
        <pre className="bg-gray-600 text-white p-4 rounded-md overflow-x-auto">
          <code>
            {`
# Clone the repository
git clone https://github.com/your-repo/node-project.git

# Navigate to the project directory
cd node-project

# Install dependencies
npm install

# Start the node
npm run start
            `.trim()}
          </code>
        </pre>
        <p className="mt-6 text-lg text-muted-foreground">
          Once your node is running, you can interact with it using the provided API or command-line interface.
        </p>
      </div>
    </section>

      <Footer />
    </main>
  );
}