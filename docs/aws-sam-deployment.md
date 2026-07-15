# AWS SAM 部署

本项目使用 AWS SAM 部署 Hono API，并复用账号中已经存在的 Aurora PostgreSQL，不会新建 RDS。React/Vite 前端部署到 Cloudflare Pages，不使用 S3 托管网站。

## 网络结构

```text
Internet
   |
API Gateway
   |
Lambda（两个私有子网，跨可用区）
   |                 \
Aurora PostgreSQL     NAT Gateway -> 公有子网 -> Internet
```

- VPC：`vpc-0c371f0627eb1893e`（与现有 Aurora 相同）
- 公有子网：`subnet-0057bf68a587eaa1e`，放置 NAT Gateway
- Lambda 私有子网：SAM 创建 `172.31.64.0/24` 和 `172.31.65.0/24`
- 数据库：复用 Aurora 集群 `database-1`
- 数据库入口：SAM 只向现有数据库安全组添加一条 5432 规则，来源限定为 Lambda 安全组

私有子网中的 Lambda 通过 NAT 访问 GitHub 等外部 API。NAT Gateway 会持续产生 AWS 费用；不用环境时可删除应用栈。

SAM 会创建一个私有 S3 制品桶，用于 CloudFormation 获取 Lambda 压缩包。它不是网站桶，不对外提供前端页面。

## GitHub Actions 配置

AWS 中的 `jy-aigc-github-oidc` 栈已经创建：

- OIDC Provider：`token.actions.githubusercontent.com`
- IAM Role：`arn:aws:iam::853086872016:role/jy-aigc-github-deploy-role`
- 信任范围：仅 `Jade-ops-tech/jy-aigc` 仓库的 `main` 分支

在 GitHub 仓库的 `Settings -> Secrets and variables -> Actions` 中配置：

Variables：

- `AWS_DEPLOY_ROLE_ARN` = `arn:aws:iam::853086872016:role/jy-aigc-github-deploy-role`
- `AWS_REGION` = `us-west-2`
- `FRONTEND_ORIGIN` = 前端实际地址；仅从本机访问时可暂用 `http://localhost:3001`
- `CLOUDFLARE_ACCOUNT_ID` = Cloudflare 账号 ID
- `CLOUDFLARE_PAGES_PROJECT` = Pages 项目名，例如 `jy-aigc`

Secrets：

- `DATABASE_PASSWORD` = 现有 Aurora `postgres` 用户密码
- `TOKEN_ENCRYPTION_KEY` = 项目本地已有的 `GITHUB_TOKEN_ENCRYPTION_KEY` 值（GitHub 禁止自定义 Secret 名称以 `GITHUB_` 开头）
- `CLOUDFLARE_API_TOKEN` = 具有 Cloudflare Pages 编辑权限的 API Token

不要把上述两个 Secret 写入 YAML、SAM 配置或 Git。

## 自动部署

工作流位于 `.github/workflows/deploy.yml`。推送到 `main` 或手动运行工作流时，它会：

1. 安装依赖并运行测试和类型检查。
2. 构建 Node.js Lambda bundle。
3. 通过 GitHub OIDC 获取短期 AWS 凭据。
4. 校验、构建并部署 SAM 后端应用。
5. 首次创建/更新时，由迁移 Lambda 执行尚未应用的 Drizzle migrations。
6. 读取 API Gateway URL，以 `VITE_SERVER_URL` 注入前端构建。
7. 使用 Wrangler Direct Upload 将 `apps/web/dist` 部署到 Cloudflare Pages。

## 本地校验与删除

```bash
pnpm --filter server build
sam validate --lint
sam build
```

删除 SAM 应用创建的 Lambda、子网、NAT 和 API（不会删除现有 Aurora）：

```bash
sam delete --stack-name jy-aigc-production --region us-west-2
```

如不再使用 GitHub 部署角色，再删除 bootstrap 栈：

```bash
aws cloudformation delete-stack --stack-name jy-aigc-github-oidc --region us-west-2
```
