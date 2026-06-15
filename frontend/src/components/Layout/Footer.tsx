// PyTrace - Minimal developer credit footer

import { Github, Linkedin, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="shrink-0 flex items-center justify-center h-6 border-t border-[#2d2d2d] bg-[#1e1e1e] text-[10px] font-mono text-[#5a5a5a] gap-1.5">
      <span>Built by Sarim Zahid</span>
      <span className="text-[#3c3c3c]">·</span>
      <a
        href="mailto:sayhitosarim@gmail.com"
        className="flex items-center gap-1 hover:text-[#9cdcfe] transition-colors"
      >
        <Mail size={11} />
        sayhitosarim@gmail.com
      </a>
      <span className="text-[#3c3c3c]">·</span>
      <a
        href="https://github.com/Mikkk1"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 hover:text-[#9cdcfe] transition-colors"
      >
        <Github size={11} />
        GitHub
      </a>
      <span className="text-[#3c3c3c]">·</span>
      <a
        href="https://linkedin.com/in/sarim-zahid-4b3636265"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 hover:text-[#9cdcfe] transition-colors"
      >
        <Linkedin size={11} />
        LinkedIn
      </a>
    </footer>
  );
}
