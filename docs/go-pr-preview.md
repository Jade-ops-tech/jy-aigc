# Go PR 独立开发环境：Cloudflare、CodeBuild 与三层 IAM

阶段 C 为每个受信任的 GitHub Pull Request 创建一套短期环境：CodeBuild 构建
ARM64 Go 镜像，CloudFormation 创建独立的 ECS/Fargate、ALB、Cloud Map 和 Lambda，
最后把带有该 Lambda HTTPS 地址的前端发布为 Cloudflare Pages Preview。PR 合并或
关闭时，CodeBuild 自动删除 AWS 运行栈。

## 流程

```text
GitHub PR webhook
       |
       v
AWS CodeBuild ----> ECR image: pr-<number>-<sha>
       |
       v
CloudFormation stack: jy-aigc-go-pr-<number>
       |
       +----> ECS/Fargate + ALB + Cloud Map + Lambda Function URL
       |
       v
Cloudflare Pages: <branch>.jy-aigc.pages.dev

PR closed/merged ----> delete CloudFormation stack
```

Cloudflare 的静态 Preview 不按运行时间收费，可以保留作为构建记录；会产生费用的
ALB、Fargate、Lambda/VPC 网络资源会随 PR 关闭删除。ECR 的 PR 镜像由现有仓库
生命周期规则清理。

## 三个 IAM 角色

| 角色 | 信任主体 | 职责 |
| --- | --- | --- |
| `jy-aigc-pr-codebuild-role` | CodeBuild | 写构建日志、推送 ECR、读取 Cloudflare token，并且只能切换到 PR 部署角色 |
| `jy-aigc-pr-deploy-role` | 上一个 CodeBuild 角色 | 只管理 `jy-aigc-go-pr-*` CloudFormation 栈，并传递指定执行角色 |
| `jy-aigc-pr-cfn-execution-role` | CloudFormation | 创建和删除 Go Preview 所需的 ECS、ALB、Cloud Map、Lambda、日志和运行时 IAM 角色 |

Webhook 还必须匹配 `PullRequestActorAccountId`。这样来自陌生账号或 fork 的 PR
不能运行拥有部署能力的构建。不要移除该过滤条件。

## 一次性准备

### 1. 创建 GitHub App Connection

在 AWS Console 的 **Developer Tools > Settings > Connections** 中创建 GitHub
connection，授权 `Jade-ops-tech/jy-aigc`，等待状态变为 `AVAILABLE`，记录 ARN。

GitHub 数字账号 ID 可以查询：

```bash
gh api users/Jade-ops-tech --jq .id
```

### 2. 创建 Cloudflare API token secret

Cloudflare 创建一个只允许当前账号 `Cloudflare Pages: Edit` 的 API token，然后把
token 作为纯文本存入 AWS Secrets Manager，例如：

```text
jy-aigc/pr-preview/cloudflare-api-token
```

不要把 token 写入参数文件、Git 或构建日志。

### 3. 调整 Cloudflare Preview 构建

阶段 C 由 CodeBuild 在得到独立 Go API 地址后运行 `wrangler pages deploy`。为了
避免同一分支重复构建，在 Cloudflare Pages 的 **Settings > Builds & deployments**
中把自动 Preview branch deployments 设为 `None`；生产分支 `main` 保持原设置。

### 4. 部署 CodeBuild 与 IAM 模板

使用阶段 B 相同的 VPC、子网、数据库 secret 和 ECR 仓库：

```bash
aws cloudformation deploy \
  --region us-west-2 \
  --stack-name jy-aigc-go-pr-pipeline \
  --template-file infra/go-pr-codebuild.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    GitHubConnectionArn=<connection-arn> \
    PullRequestActorAccountId=<github-numeric-id> \
    VpcId=<vpc-id> \
    PublicSubnetIds=<public-subnet-a>,<public-subnet-b> \
    TaskSubnetIds=<task-subnet-a>,<task-subnet-b> \
    AssignPublicIp=ENABLED \
    DatabaseUrlSecretArn=<database-secret-arn> \
    CloudflareAccountId=<cloudflare-account-id> \
    CloudflareApiTokenSecretArn=<cloudflare-token-secret-arn> \
    WebServerUrl=<existing-node-api-https-url>
```

当前 Neon 验收模式需要外网出口，所以沿用阶段 B 的临时公有 Task 子网和
`AssignPublicIp=ENABLED`。切换到 VPC 内数据库及 private endpoints 后再改为
`DISABLED`。

## 验收

1. 从仓库内部创建 `codex/demo-pr-preview` 分支并打开指向 `main` 的 PR。
2. GitHub PR Checks 中确认 `jy-aigc-go-pr-preview` 成功。
3. CodeBuild 日志末尾会输出 AWS stack、Go API 和 Cloudflare Preview URL。
4. 打开 Preview 的 `/about`，生成个人简介，确认请求命中本 PR 的 Function URL。
5. 更新 PR 后确认同一 `pr-<number>` 栈被更新，而不是创建重复栈。
6. 关闭 PR，确认 CloudFormation 栈删除完成。

只检查而不触发部署时，可以先运行：

```bash
aws cloudformation validate-template \
  --region us-west-2 \
  --template-body file://infra/go-pr-codebuild.yaml
```

## 手动清理

如果 PR webhook 没有执行关闭事件：

```bash
aws cloudformation delete-stack \
  --region us-west-2 \
  --stack-name jy-aigc-go-pr-<number>
```

所有 PR 都演示完成后，再删除流水线本身：

```bash
aws cloudformation delete-stack \
  --region us-west-2 \
  --stack-name jy-aigc-go-pr-pipeline
```

删除流水线不会删除仍存在的 `jy-aigc-go-pr-*` 运行栈，必须先确认这些栈已经清理。
