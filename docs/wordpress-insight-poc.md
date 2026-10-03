# WordPress Insight PoC

Phase 5では、公開済みWordPress投稿3件を`insight`へ明示的に割り当てる。

- 取得は`npm run build`内だけで行い、ブラウザからWordPress REST APIへ接続しない。
- 対象ID、slug、route、既存canonical、表示分類、featured imageの装飾・内容判定は`src/data/wordpress-insight-manifest.json`で固定する。
- 取得件数、ID、slug、canonical、status、Contract schema、重複、withdrawalを検証し、不一致ならbuildを失敗させる。
- 本文はallowlistでsanitizeし、iframeはHTTPSのYouTube embedだけを許可する。script、広告embed、tracking、shortcodeは公開しない。
- featured imageはbuild時に取得・decodeし、JPEG/PNG等はWebP化してlocal配信する。GIFの場合はフレームを変えず元GIFを保存する。
- 今回のfeatured imageは記事見出しと同じ対象を示す装飾画像で、WordPressのaltも空のため`alt=""`を維持する。内容画像の空altは推測補完せず移行対象外とする。
- 本文内のremote画像はPoC対象外とし、検出時はbuildを失敗させる。
- 既存WordPress canonicalとpercent-encoded slugを維持し、redirectは生成しない。
- CMS障害時は新buildを失敗させ、既存のGitHub Pages公開物を置き換えない。

承認済みwithdrawalはmanifestの`withdrawals`へID、既存canonical、理由、承認日を明記する。記録のない記事消失はbuild failureとする。
