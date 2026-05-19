import React from "react";
import {
  ChevronUp,
  ChevronDown,
  ArrowUpToLine,
  ArrowDownToLine,
} from "lucide-react";
import { Message } from "../types/index";

interface MessageNavToolbarProps {
  messages: Message[];
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  lastJumpedMessageId: React.MutableRefObject<string | null>;
}

export default function MessageNavToolbar({
  messages,
  messagesContainerRef,
  lastJumpedMessageId,
}: MessageNavToolbarProps) {
  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
      {/* Jump to Previous User Query */}
      <button
        onClick={() => {
          if (!messagesContainerRef.current) return;
          const container = messagesContainerRef.current;
          const userMessages = messages
            .map((msg, idx): { msg: Message; idx: number } => ({ msg, idx }))
            .filter(({ msg }): boolean => msg.role === "user");

          if (userMessages.length === 0) return;

          let targetIndex = -1;

          if (lastJumpedMessageId.current) {
            const currentIdx = userMessages.findIndex(
              ({ msg }) => msg.id === lastJumpedMessageId.current,
            );
            if (currentIdx > 0) {
              targetIndex = currentIdx - 1;
            } else if (currentIdx === 0) {
              targetIndex = 0;
            }
          }

          if (targetIndex === -1) {
            const scrollTop = container.scrollTop;
            const viewportTop = scrollTop + 50;

            for (let i = userMessages.length - 1; i >= 0; i--) {
              const msgElement = container.querySelector(
                `[data-message-id="${userMessages[i].msg.id}"]`,
              );
              if (msgElement) {
                const elementTop = (msgElement as HTMLElement).offsetTop;
                if (elementTop < viewportTop) {
                  targetIndex = i;
                  break;
                }
              }
            }
            if (targetIndex === -1) {
              targetIndex = 0;
            }
          }

          const targetMsg = container.querySelector(
            `[data-message-id="${userMessages[targetIndex].msg.id}"]`,
          );
          if (targetMsg) {
            lastJumpedMessageId.current = userMessages[targetIndex].msg.id;
            targetMsg.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }}
        className="bg-legal-blue/90 hover:bg-legal-blue p-3 rounded-lg shadow-lg transition-colors border border-blue-500 backdrop-blur-sm"
        title="Jump to previous query"
        aria-label="Jump to previous query"
      >
        <ArrowUpToLine className="w-5 h-5 text-white" />
      </button>

      {/* Scroll Up */}
      <button
        onClick={() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollBy({
              top: -window.innerHeight * 0.8,
              behavior: "smooth",
            });
          }
        }}
        className="bg-gray-700/90 hover:bg-gray-600 p-3 rounded-lg shadow-lg transition-colors border border-gray-600 backdrop-blur-sm"
        title="Scroll up"
        aria-label="Scroll up"
      >
        <ChevronUp className="w-5 h-5 text-gray-300" />
      </button>

      {/* Scroll Down */}
      <button
        onClick={() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollBy({
              top: window.innerHeight * 0.8,
              behavior: "smooth",
            });
          }
        }}
        className="bg-gray-700/90 hover:bg-gray-600 p-3 rounded-lg shadow-lg transition-colors border border-gray-600 backdrop-blur-sm"
        title="Scroll down"
        aria-label="Scroll down"
      >
        <ChevronDown className="w-5 h-5 text-gray-300" />
      </button>

      {/* Jump to Next User Query */}
      <button
        onClick={() => {
          if (!messagesContainerRef.current) return;
          const container = messagesContainerRef.current;
          const userMessages = messages
            .map((msg, idx): { msg: Message; idx: number } => ({ msg, idx }))
            .filter(({ msg }): boolean => msg.role === "user");

          if (userMessages.length === 0) return;

          let targetIndex = -1;

          if (lastJumpedMessageId.current) {
            const currentIdx = userMessages.findIndex(
              ({ msg }) => msg.id === lastJumpedMessageId.current,
            );
            if (currentIdx !== -1 && currentIdx < userMessages.length - 1) {
              targetIndex = currentIdx + 1;
            } else if (currentIdx === userMessages.length - 1) {
              targetIndex = currentIdx;
            }
          }

          if (targetIndex === -1) {
            const scrollTop = container.scrollTop;
            const viewportBottom = scrollTop + container.clientHeight - 50;

            for (let i = 0; i < userMessages.length; i++) {
              const msgElement = container.querySelector(
                `[data-message-id="${userMessages[i].msg.id}"]`,
              );
              if (msgElement) {
                const elementTop = (msgElement as HTMLElement).offsetTop;
                if (elementTop > viewportBottom) {
                  targetIndex = i;
                  break;
                }
              }
            }
            if (targetIndex === -1) {
              targetIndex = userMessages.length - 1;
            }
          }

          const targetMsg = container.querySelector(
            `[data-message-id="${userMessages[targetIndex].msg.id}"]`,
          );
          if (targetMsg) {
            lastJumpedMessageId.current = userMessages[targetIndex].msg.id;
            targetMsg.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }}
        className="bg-legal-blue/90 hover:bg-legal-blue p-3 rounded-lg shadow-lg transition-colors border border-blue-500 backdrop-blur-sm"
        title="Jump to next query"
        aria-label="Jump to next query"
      >
        <ArrowDownToLine className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}
