"use client";

import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { mermaid } from "@streamdown/mermaid";
import { math } from "@streamdown/math";
import { cjk } from "@streamdown/cjk";

interface MarkdownProps {
    children: string;
    className?: string;
    mode?: "streaming" | "static" | undefined;
}

export function Markdown({ children, className, mode = "static" }: MarkdownProps) {
    return (
        <div className={className}>
            <Streamdown 
                plugins={{ code, mermaid, math, cjk }}
                mode={mode}
            >
                {children}
            </Streamdown>
        </div>
    );
}
