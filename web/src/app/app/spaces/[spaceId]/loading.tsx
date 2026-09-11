import { PixelPanel } from '@/shared/ui/pixel-panel';
export default function Loading() {
  return <main className="shared-page" aria-busy="true"><PixelPanel><h1>正在打開共同分帳寶箱…</h1><p>金額與位置確認完成前不會顯示推測值。</p></PixelPanel></main>;
}
