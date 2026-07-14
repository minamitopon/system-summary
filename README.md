# system-summary

## システムビューア

[GitHub Pagesでシステムを見る](https://minamitopon.github.io/system-summary/)

スマートフォン対応のビューアで、2段階のオークション表示、変更をまとめる提案ドラフト、インラインコメントを確認できます。

Pull Requestには `https://minamitopon.github.io/system-summary/previews/pr-<PR番号>/` 形式の確認用URLが自動で付きます。レビュー中のコードと `index.bml` を、マージ前に実際の画面で確認できます。

現在、提案とコメントはブラウザ内のプレビューで、外部保存とPR作成は無効です。共同利用版の認証・PR・コメント設計は `docs/collaboration-architecture.md` を参照してください。

## ブランチルール
### main
リリース後のシステムのみが存在する。  
mainブランチにあるサマリーを最新のものとし、その他のブランチで議論中のシステム等は使用しない。  

### development
開発ブランチは基本的にここから切る。  
developmentにマージされたもののみ、mainに組み込むことが可能。  

#### feature/xxxxxx
システムの改修用ブランチ。  
developmentブランチから新規に作成し、該当箇所を編集後プルリクを作成する。  
レビュアーは、自分以外の参加者。  
提案に関する議論は、そのプルリク内で行う。  
全員から承認を得られたら、レビュイーがdevelopmentブランチにマージする。  

#### bugfix/xxxxxx
システムの誤植等を直すブランチ。  
developmentブランチから新規に作成し、該当箇所を編集後プルリクを作成する。  
レビュアーは、Shellingまたはpon。  
あくまでサマリーの体裁を整えるための修正を行うブランチなので、システムの改修を伴う場合はfeatureブランチで作業する。  
