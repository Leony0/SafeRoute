# ベースイメージ
FROM node:18

# 作業ディレクトリを設定
WORKDIR /app

# 依存関係をインストール
COPY package.json package-lock.json ./
RUN npm install

# アプリケーションコードをコピー
COPY . .

# 開発サーバーを起動
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
