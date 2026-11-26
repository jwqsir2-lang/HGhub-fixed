import { useCallback, useEffect, useRef, useState } from "react";
import Feed from "../components/Feed";
import { api } from "../api";
import type { VideoCard } from "../types";
import { useStore } from "../store";
import { IGrid, ISearch } from "../icons";
import { Empty } from "../components/ui";

export default function Home({ active, bottomInset }: { active: boolean; bottomInset: number }) {
  const { toast, push } = useStore();
  const [items, setItems] = useState<VideoCard[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const loadingRef = useRef(false);

  const load = useCallback(async (p: number) => {
    if (loadingRef.current || done) return;
    loadingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const res = await api.feed(p, 10);
      const list = res?.items || [];
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...list.filter((x) => !seen.has(x.id))];
      });
      setPage(p);
      if (!list.length || (res?.pagination && p >= res.pagination.pages)) setDone(true);
    } catch (e) {
      const message = (e as Error).message || "加载失败";
      setError(message);
      toast(message, "info");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [done, toast]);

  useEffect(() => { if (!items.length) load(1); /* eslint-disable-next-line */ }, []);

  const ids = items.map((v) => v.id);

  return (
    <div className="absolute inset-0 bg-black">
      {items.length ? (
        <Feed videoIds={ids} mode="home" active={active} bottomInset={bottomInset}
          onNearEnd={() => { if (!loading && !done) load(page + 1); }} />
      ) : !loading && error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-bg">
          <Empty icon={<ISearch size={26} />} title="首页加载失败" sub={error} action="重试" onAction={() => void load(1)} />
        </div>
      ) : !loading && done ? (
        <div className="absolute inset-0 flex items-center justify-center bg-bg"><Empty icon={<ISearch size={26} />} title="暂无视频" /></div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center"><div className="w-9 h-9 spinner" /></div>
      )}
      {/* 首页板块入口（v1.2.6）：黄果原创 / 最近上新 / 精选推荐 */}
      {items.length > 0 && (
        <button onClick={() => push({ kind: "sections" })} aria-label="首页板块"
          className="absolute z-20 left-3 flex items-center gap-1.5 h-9 px-3 rounded-full hg-chip-strong backdrop-blur-md text-white text-[12px] font-semibold pressable"
          style={{ top: "calc(var(--sat, 0px) + 12px)" }}>
          <IGrid size={15} />首页板块
        </button>
      )}
    </div>
  );
}
