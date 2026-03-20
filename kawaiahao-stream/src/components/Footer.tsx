import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0a0a0a] border-t border-[#2a2a2a] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Church Info */}
          <div>
            <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#c9972b] mb-3">
              Kawaiahao Church
            </h3>
            <p className="text-sm text-[#888888] leading-relaxed">
              957 Punchbowl St<br />
              Honolulu, HI 96813
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-[#e8e8e8] uppercase tracking-wider mb-3">
              Quick Links
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-[#888888] hover:text-[#c9972b] transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/sermons"
                  className="text-sm text-[#888888] hover:text-[#c9972b] transition-colors"
                >
                  Sermon Archive
                </Link>
              </li>
              <li>
                <Link
                  href="/prayer"
                  className="text-sm text-[#888888] hover:text-[#c9972b] transition-colors"
                >
                  Prayer Requests
                </Link>
              </li>
            </ul>
          </div>

          {/* External */}
          <div>
            <h4 className="text-sm font-semibold text-[#e8e8e8] uppercase tracking-wider mb-3">
              Connect
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://kawaiahao.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#888888] hover:text-[#c9972b] transition-colors"
                >
                  kawaiahao.org
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-[#2a2a2a] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#555555]">
            &copy; {currentYear} Kawaiahao Church. All rights reserved.
          </p>
          <p className="text-xs text-[#555555]">
            Streaming powered by automation
          </p>
        </div>
      </div>
    </footer>
  );
}
