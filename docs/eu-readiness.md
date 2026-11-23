# EU向け提供の準備状況（2026-09-19）

EUから単にアクセスできる場合と、EU域内の人に向けて会員登録・課金・楽曲配信を提供する場合では適用範囲が異なります。運営主体・対象国・利用規模が未確定のため、**この変更だけでEU法への適合は完了しません**。

## 実装済み

| 項目 | 実装 | 限界 |
| --- | --- | --- |
| 任意の聴取履歴利用 | `listening_data_use` を新規・既存アカウントともオフにし、推薦とタグ提案でサーバー側の設定を検査。以後の変更を `privacy_consent_events` に記録 | 再生・分配・不正検知用の記録は継続。説明を改訂したら記録の `notice_version` も更新する |
| プロフィール・投稿公開 | 新規アカウントの初期値を非公開にし、プロフィール・公開投稿・関連コメントのDB読み取りを設定で制限 | 既存アカウントの公開設定は維持。SNSの他のデータは別途監査が必要 |
| 本人の権利請求 | 受付、本人限定の履歴、管理者の確認・回答画面を追加 | 実データの開示・訂正・削除・移転は担当者が実行する |
| 個人データ説明 | `/privacy` を公開し、登録画面とフッターからリンク | 運営者・保持期間・域外移転情報の入力と法務確認が必要 |

## 導入手順

1. DBのバックアップを取得し、`supabase/migrations/20260919060411_eu_privacy_rights.sql` をステージングで適用する。既存の `listening_data_use = true` はすべて false になる。先に対象人数を数え、利用者向けの変更通知を用意する。
2. 本人・他人・未ログインの3条件でRLSを検証する。プロフィールと投稿は本人または公開設定オンのときだけ読めること、`privacy_requests` は本人だけが読んで作成でき、本人が状態を変更できないこと、`privacy_consent_events` の追記・改変が本人からできないことを確認する。
3. 次のサーバー環境変数を実在する情報で設定し、公開ページ `/privacy` を確認する。値はページに表示される。

   - `PRIVACY_OPERATOR_NAME`：運営者の正式名称
   - `PRIVACY_OPERATOR_ADDRESS`：地理的住所
   - `PRIVACY_CONTACT_EMAIL`：個人データ窓口
   - `PRIVACY_RETENTION_POLICY`：カテゴリ別の保存期間または決定基準
   - `PRIVACY_TRANSFER_NOTICE`：EU域外への移転先と保護措置
   - `PRIVACY_EU_REPRESENTATIVE`：必要な場合のEU域内代理人

4. 担当者は `/admin/privacy-requests` を定期的に確認し、原則1か月以内に回答する。本人確認と法的保存義務を確認し、Supabase Auth、DB、Cloudflare R2、Stripe、Resend、バックアップ・ログを横断して処理する。回答画面で「完了」を押す前に実処理を確認する。現在は回答をアプリ内で確認する方式で、メール通知はない。

## EU向け提供前の未完了事項

- **法的通知**：運営者、処理目的ごとの根拠、受領者、保存期間、第三国移転、監督機関への申立て先、子ども向け説明を実データと契約に合わせて確定する。`/privacy` は完成した法務文書ではない。
- **権利の実行**：完全なセルフサービスのデータエクスポート・削除は未実装。金融記録、著作権・分配債務、第三者の投稿・メッセージを考慮した手順とツールが必要。
- **音楽の権利**：EUで公開する各楽曲について著作物、実演、原盤、地域、期間、共同権利者を確認する。アーティスト登録の自己申告だけではEU向け配信許諾を証明できない。
- **DSA**：現行の `/api/reports` はログインを要求する。EU向けホスティングに該当する場合、違法コンテンツの電子通報、受付・判断、制限理由、連絡先、異議申立て等の適用範囲を確定し、必要な公開導線を実装する。
- **消費者契約**：EU向けの価格（税・通貨・総額）、契約前情報、解約と撤回の違い、撤回機能、デジタルサービスの救済、決済事業者の提供地域を確認する。Stripeの解約画面は法定撤回機能を自動的に満たさない。
- **端末保存・広告**：確認できたブラウザ保存はログインCookie、テーマ・音量正規化設定、登録時の紹介コード。広告、解析、ピクセル等の非必須保存を追加する前に、目的別の事前同意と拒否・撤回を実装する。
- **委託と移転**：Supabase、Cloudflare R2、Stripe、Resendの契約・DPA、配置リージョン、EU域外移転の保護措置、事故対応と保持・削除方針を確認する。
- **公開範囲の追加監査**：フォロー、いいね、参加履歴、支援履歴、DM、通知、管理者経由のAPIを個別に監査する。今回のRLSだけでSNS全体の非公開化は完成しない。

## 一次資料

- [EDPB: GDPRの域外適用](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-32018-territorial-scope-gdpr-article-3-version_en)
- [EDPB: 本人の権利と回答期限](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en)
- [EDPB: 処理の法的根拠](https://www.edpb.europa.eu/sme/be-compliant/process-personal-data-lawfully_en)
- [ePrivacy指令](https://eur-lex.europa.eu/eli/dir/2002/58/oj/eng)
- [情報社会指令3条](https://eur-lex.europa.eu/eli/dir/2001/29/oj/eng)
- [Digital Services Act](https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng)
- [消費者権利指令・撤回機能改正](https://eur-lex.europa.eu/eli/dir/2023/2673/oj/eng)
- [Supabase: RLSと権限設定](https://supabase.com/docs/guides/database/postgres/row-level-security)
