"use client";

import ModeToggle from "./ModeToggle";
import BackgroundToggle from "./BackgroundToggle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  BookOpen01Icon, 
  FlashIcon, 
  ChartHistogramIcon, 
  Settings01Icon,
  GithubIcon,
  NewTwitterIcon,
  DiscordIcon,
  Linkedin02Icon,
  YoutubeIcon,
  Rocket01Icon,
  AiCloud01Icon,
  InformationCircleIcon,
  SecurityCheckIcon,
  File01Icon
} from "@hugeicons/core-free-icons";

export default function Footer() {
  const pathname = usePathname();
  
  // Hide footer on Sift Session page for immersive experience
  if (pathname?.startsWith("/sift")) {
    return null;
  }

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
      }
    },
  };

  return (
    <footer className="print:hidden pt-0 pb-12 md:pb-8 font-jakarta">
      <motion.div 
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        className="flex flex-col mx-auto max-w-7xl bg-foreground/5 px-8 py-8 sm:rounded-2xl backdrop-blur border border-foreground/5 bg-white/80 dark:bg-background/75 text-sm text-zinc-700 dark:text-zinc-300"
      >
        <motion.div variants={item} className="flex items-center justify-between gap-4 border-b-2 border-dashed pb-4">
          <div className="text-base font-medium flex items-center gap-1">
            <img src="/sift-mascot.webp" alt="Sift mascot" className="h-20 w-20" />
            <div className="flex flex-col mb-2">
              <Link href="/" className="text-4xl md:text-5xl font-bold tracking-tighter">sift.</Link>
              <p className="text-sm md:text-base text-muted-foreground font-medium mt-1">Active Recall Engine 
                {/* / <span className="text-foreground/30">Quiz thingy</span> */}
                </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BackgroundToggle />
            <ModeToggle />
          </div>
        </motion.div>

        <div className="mt-8 mb-2 grid grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
         <motion.div variants={item} className="flex flex-col gap-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</div>
            <div className="flex flex-col gap-2 text-sm text-foreground/80">
              <Link href="/" className="hover:text-primary transition-colors w-fit flex items-center gap-2">
                <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4" />
                About Sift
              </Link>
            </div>
          </motion.div>

          <motion.div variants={item} className="flex flex-col gap-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resources</div>
            <div className="flex flex-col gap-2 text-sm text-foreground/80">
              <Link href="/login" className="hover:text-primary transition-colors w-fit flex items-center gap-2">
                <HugeiconsIcon icon={Rocket01Icon} className="h-4 w-4" />
                Getting Started
              </Link>
              <Link href="/ai" className="hover:text-primary transition-colors w-fit flex items-center gap-2">
                <HugeiconsIcon icon={AiCloud01Icon} className="h-4 w-4" />
                AI Studio
              </Link>
            </div>
          </motion.div>
          <motion.div variants={item} className="flex flex-col gap-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</div>
            <div className="flex flex-col gap-2 text-sm text-foreground/80">
              <Link href="/dashboard" className="hover:text-primary transition-colors w-fit flex items-center gap-2">
                <HugeiconsIcon icon={BookOpen01Icon} className="h-4 w-4" />
                Library
              </Link>
              <Link href="/sifts" className="hover:text-primary transition-colors w-fit flex items-center gap-2">
                <HugeiconsIcon icon={FlashIcon} className="h-4 w-4" />
                Sifts
              </Link>
              <Link href="/echoes" className="hover:text-primary transition-colors w-fit flex items-center gap-2">
                <HugeiconsIcon icon={ChartHistogramIcon} className="h-4 w-4" />
                Echoes
              </Link>
            </div>
          </motion.div>
          <motion.div variants={item} className="flex flex-col gap-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Legal</div>
            <div className="flex flex-col gap-2 text-sm text-foreground/80">
              <Link href="/policies/privacy" className="hover:text-primary transition-colors w-fit flex items-center gap-2">
                <HugeiconsIcon icon={SecurityCheckIcon} className="h-4 w-4" />
                Privacy Policy
              </Link>
              <Link href="/policies/terms" className="hover:text-primary transition-colors w-fit flex items-center gap-2">
                <HugeiconsIcon icon={File01Icon} className="h-4 w-4" />
                Terms of Service
              </Link>
            </div>
          </motion.div>
          <motion.div variants={item} className="flex flex-col gap-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Socials</div>
            <div className="flex gap-4">
                <Link href="https://github.com" target="_blank" className="text-muted-foreground hover:text-foreground transition-colors">
                    <HugeiconsIcon icon={GithubIcon} className="h-5 w-5" />
                </Link>
                <Link href="https://twitter.com" target="_blank" className="text-muted-foreground hover:text-foreground transition-colors">
                    <HugeiconsIcon icon={NewTwitterIcon} className="h-5 w-5" />
                </Link>
                <Link href="https://linkedin.com" target="_blank" className="text-muted-foreground hover:text-foreground transition-colors">
                    <HugeiconsIcon icon={Linkedin02Icon} className="h-5 w-5" />
                </Link>
            </div>
          </motion.div>
        </div>

        {/* <div title="footer" className="md:mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row md:border-t pt-0 md:pt-6 text-foreground/45 text-xs">
          <div className="flex flex-col sm:hidden gap-2 items-center justify-center opacity-55 dark:opacity-40">
            <Link href="/" className="text-foreground/70 hover:text-foreground/80 transition-colors cursor-pointer">About Sift</Link>
            <p className="font-medium text-muted-foreground/50">Version: v{process.env.NEXT_PUBLIC_APP_VERSION}</p>
          </div>
          <div className="hidden sm:flex">© {new Date().getFullYear()} Sift. All rights reserved.<a href="https://v19.tech/?utm_source=sift&utm_medium=referral&utm_campaign=built_by_v19" target="_blank" rel="noopener noreferrer" className="ml-1 text-inherit opacity-80 underline-offset-2 hover:underline">Built by V19</a></div>
          <div className="hidden sm:flex items-center gap-4">
            <Link href="/policies/privacy" className="hover:text-foreground/80 transition-colors cursor-pointer">Privacy</Link>
            <Link href="/policies/terms" className="hover:text-foreground/80 transition-colors cursor-pointer">Terms</Link>
            <p className="font-medium text-muted-foreground/50 sm:block hidden">v{process.env.NEXT_PUBLIC_APP_VERSION}</p>
          </div>
        </div> */}
      </motion.div>
    </footer>
  );
}
