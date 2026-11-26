import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { VideoCard } from "../types";
import { useStore, type SectionKind } from "../store";
import { Masonry } from "../components/cards";
import { Empty } from "../components/ui";
import { IBack, IGrid } from "../icons";

/* 首页板块（v1.2.6 新增，v1.2.7 改入口）：与站点首页同名的三个板块。
   入口在桌面左侧栏「分类」与「我的」之间（见 components/DesktopChrome.tsx），
   点击打开对应板块的分页网格页（本文件的 SectionPage）。
   数据源（2026-11-26 实测站点现行接口）：
   - 最近上新 → GET /api/home/latest（分页、发布时间倒序）
   - 精选推荐 → GET /api/home/recommends（分页、站方推荐序）
   - 黄果原创 → 站点无独立接口；作品在各列表里带 badge="黄果原创"，
     故逐页扫上新列表按角标过滤（同为最新在前，与站点首页该板块的取向一致）。 */

export const SECTIONS: { kind: SectionKind; name: string; desc: string }[] = [
  { kind: "original", name: "黄果原创", desc: "黄果出品 · 原创短剧与漫剧" },
  { kind: "latest", name: "最近上新", desc: "每日上新 · 最新在前" },
  { kind: "recommends", name: "精选推荐", desc: "站方精选 · 口碑之作" },
];

const ORIGINAL_BADGE = "黄果原创";
const isOriginal = (v: VideoCard) => (v.badge || "") === ORIGINAL_BADGE;

/* ================= 板块页（分页网格） ================= */

export function SectionPage({ section, name, onBack, wide }: {
  section: SectionKind; name: string; onBack: () => void; wide: boolean;
}) {
  const { push } = useStore();
  const [items, setItems] = useState<VideoCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const busy = useRef(false);
  const pageRef = useRef(0);          // latest / recommends 的当前页
  const cursorRef = useRef(0);        // original 已扫到的上新页
  const latestPagesRef = useRef(Number.POSITIVE_INFINITY);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (busy.current || done) return;
    busy.current = true;
    setLoading(true);
    try {
      if (section === "original") {
        // 逐页扫上新列表攒原创：一轮至少再扫 1 页、攒够 12 条或扫完为止
        const collected: VideoCard[] = [];
        while (cursorRef.current < latestPagesRef.current && collected.length < 12) {
          const next = cursorRef.current + 1;
          const res = await api.homeLatest(next, 20);
          cursorRef.current = next;
          latestPagesRef.current = res?.pagination?.pages ?? next;
          collected.push(...(res?.items || []).filter(isOriginal));
        }
        setItems((prev) => {
          const seen = new Set(prev.map((x) => x.id));
          return [...prev, ...collected.filter((x) => !seen.has(x.id))];
        });
        if (cursorRef.current >= latestPagesRef.current) setDone(true);
      } else {
        const next = pageRef.current + 1;
        const res = section === "latest"
          ? await api.homeLatest(next, 20)
          : await api.homeRecommends(next, 20);
        pageRef.current = next;
        const pages = res?.pagination?.pages ?? next;
        setItems((prev) => {
          const seen = new Set(prev.map((x) => x.id));
          return [...prev, ...(res?.items || []).filter((x) => !seen.has(x.id))];
        });
        if (next >= pages) setDone(true);
      }
      setErr(null);
    } catch (e) {
      setErr((e as Error).message || "加载失败");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [section, done]);

  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  useEffect(() => { void loadMoreRef.current(); }, []);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => {
      if (es[0].isIntersecting) void loadMoreRef.current();
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="absolute inset-0 bg-bg flex flex-col">
      <div className="shrink-0 bg-s1" style={{ paddingTop: "var(--sat, 0px)" }}>
        <div className="px-3 pt-2 pb-3 flex items-center gap-2.5">
          <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center text-on hover:bg-s3 pressable"><IBack size={20} /></button>
          <span className="w-[40px] h-[40px] rounded-(--r-sm) bg-pc text-on-pc flex items-center justify-center"><IGrid size={21} strokeWidth={1.9} /></span>
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-bold text-on leading-tight">{name}</div>
            <div className="text-[10.5px] text-mut">共 {items.length} 部{done ? " · 已全部加载" : ""}</div>
          </div>
        </div>
      </div>
      <div className="flex-1 scroll-y px-4 pt-3 pb-8">
        {items.length ? (
          <Masonry videos={items} wide={wide} dense onOpen={(v) => push({ kind: "feed", videoIds: items.map((x) => x.id), index: items.findIndex((x) => x.id === v.id), title: name })} />
        ) : err ? (
          <Empty icon={<IGrid size={26} />} title="加载失败" sub={err} action="重试" onAction={() => void loadMoreRef.current()} />
        ) : (
          <div className="flex justify-center py-10"><div className="w-8 h-8 spinner" /></div>
        )}
        <div ref={sentinel} className="h-10" />
        {loading && items.length > 0 && <div className="flex justify-center py-3"><div className="w-6 h-6 spinner" /></div>}
        {!loading && done && items.length > 0 && (
          <div className="text-center text-[10.5px] text-dim py-3">— 已经到底啦 —</div>
        )}
      </div>
    </div>
  );
}
