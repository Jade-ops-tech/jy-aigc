# Go API：ECR、ECS Fargate、ALB 与 Cloud Map

阶段 B 将 `apps/go-api` 构建为 ARM64 容器镜像，通过 ECR 保存镜像，
在 ECS Fargate 私有子网中运行，并由公网 ALB 转发请求。ECS 会把健康 Task
注册到 Cloud Map；模板内的 Lambda 位于相同 VPC，通过私有 DNS 直接请求
Go API，用于验证 Lambda 与 Cloud Map 的连接。

## 当前阶段 B 部署

2026-07-22 已在账号 `853086872016` 的 `us-west-2` 完成：

- ECR stack：`jy-aigc-go-ecr`
- Runtime stack：`jy-aigc-go-production`
- Image：`stage-b-3e588fd9af1f-r2`
- Image digest：`sha256:2efc2bd71a1a69a49ab4468cae59533b2020819ee5b988dbd487d8eb29152cd8`
- API：`http://jy-aig-LoadB-H86Ve7TGPCbY-1067965570.us-west-2.elb.amazonaws.com`
- Cloud Map：`go-api.production.jy-aigc.internal`

当前运行栈为外部 Neon 验收模式：Fargate Task 位于跨可用区公有子网并分配
public IP，但 Task 安全组没有公网入站，只接受 ALB 和 Cloud Map probe Lambda。
切换 Aurora 后应使用私有子网和 private endpoints，或先修复共享 NAT。

当前 ALB 只有 HTTP listener。浏览器使用 Cloud Map Lambda 的 Function URL 作为
HTTPS API 入口，Lambda 再通过私有 DNS 调用 ECS；因此不会发生 HTTPS 页面调用
HTTP ALB 的 mixed-content 问题。若后续需要让浏览器直接访问 ALB，再为 API 域名
配置 ACM + ALB HTTPS。

## 架构

```text
Internet / Cloudflare ----> Lambda Function URL
                                  |
                                  v
Public ALB              Cloud Map private DNS
        |                         |
        +-------------------------+
                    |
                    v
         ECS Fargate Go API
                    |
                    v
               PostgreSQL
```

Cloud Map 名称为：

```text
go-api.<environment>.<project>.internal
```

Cloud Map 流量直接进入 ECS Task 的私有 IP，不经过 ALB。

## 前置条件

- AWS CLI 已配置到目标账号和 Region。
- Docker Buildx 可用。
- VPC 已启用 DNS support 和 DNS hostnames。
- 两个不同可用区的公有子网供 ALB 使用。
- 至少两个私有子网供 ECS 和 Lambda 使用。
- 私有子网具有 NAT 出口，或已配置 ECR API、ECR DKR、S3、CloudWatch Logs
  和 Secrets Manager VPC endpoints。
- PostgreSQL 已存在，且 `todo` 等 Drizzle migrations 已应用。

当前 `template.yaml` 会输出它创建的两个私有子网、Lambda 安全组以及现有数据库
安全组。ALB 还需要目标 VPC 中第二个不同可用区的公有子网；不能只传同一个子网。

### 当前 AWS 账号的网络检查结果

2026-07-22 的只读检查结果：

- VPC：`vpc-0c371f0627eb1893e`
- 私有子网：`subnet-002b3088c2dd44085`（us-west-2b）和
  `subnet-05debb928dc9d2e3c`（us-west-2c）
- 私有路由表：`rtb-0aa9075dd4c55a312`
- 该路由表原有 NAT route 当前为 `blackhole`，引用的 NAT Gateway 已不存在
- VPC 内另有四个跨可用区公有子网，主路由表正常指向 Internet Gateway

因此当前账号不能直接以默认参数启动私有 Fargate Task。推荐选择以下一种方式：

1. 阶段 B 当前推荐：部署模板时设置 `CreatePrivateEndpoints=true`，并传入
   `PrivateRouteTableIds=rtb-0aa9075dd4c55a312`。这适合访问同 VPC Aurora，
   不依赖 NAT。
2. 修复或重新创建共享 NAT Gateway，再保持 `CreatePrivateEndpoints=false`。
3. 仅用于临时验证：将两个公有子网传给 `PrivateSubnetIds`，并设置
   `AssignPublicIp=ENABLED`。安全组仍只接受 ALB 和 Lambda 入站，但该方式不作为
   生产推荐。

如果使用 Neon 等外部数据库，私有 endpoint 不能提供互联网出口，必须修复 NAT
或使用临时 public-IP 模式。

## 1. 创建 ECR

ECR 使用独立 bootstrap stack，避免第一次部署时 ECS 引用尚不存在的镜像：

```bash
aws cloudformation deploy \
  --region us-west-2 \
  --stack-name jy-aigc-go-ecr \
  --template-file infra/go-ecr.yaml
```

读取仓库 URI：

```bash
aws cloudformation describe-stacks \
  --region us-west-2 \
  --stack-name jy-aigc-go-ecr \
  --query 'Stacks[0].Outputs[?OutputKey==`RepositoryUri`].OutputValue' \
  --output text
```

仓库使用 immutable tags、push scanning，并清理超过保留策略的旧镜像。删除
CloudFormation stack 时仓库默认保留，避免误删镜像。

## 2. 构建和推送 ARM64 镜像

使用提交 SHA 或发布编号作为不可变 tag，不要反复推送 `latest`：

```bash
aws ecr get-login-password --region us-west-2 | \
  docker login --username AWS --password-stdin <account>.dkr.ecr.us-west-2.amazonaws.com

docker buildx build \
  --platform linux/arm64 \
  --provenance=false \
  --tag <repository-uri>:<git-sha> \
  --push \
  apps/go-api
```

Docker build 使用 Go 1.26.5，最终镜像为非 root、只包含静态二进制和 CA
证书的 `scratch` 镜像。ECS 健康检查执行 `/go-api healthcheck`，不依赖 shell、
curl 或 wget。

## 3. 创建数据库 Secret

在 Secrets Manager 创建一个 secret，例如：

```text
jy-aigc/production/go-api/database-url
```

secret value 是完整 PostgreSQL URL。建议通过 AWS Console 或受控凭据流程录入，
不要把 URL 写进 Git、CloudFormation 参数文件、终端历史或构建日志。

记录 secret ARN，部署时传给 `DatabaseUrlSecretArn`。ECS Task Execution Role
只有读取这一个 secret 的权限；业务 Task Role 不读取 secret。

## 4. 部署 ECS、ALB、Cloud Map 与 Lambda

Aurora/RDS 位于同一 VPC 时，传入数据库安全组：

```bash
aws cloudformation deploy \
  --region us-west-2 \
  --stack-name jy-aigc-go-production \
  --template-file infra/go-ecs.yaml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    ImageUri=<repository-uri>:<git-sha> \
    VpcId=<vpc-id> \
    PublicSubnetIds=<public-subnet-a>,<public-subnet-b> \
    PrivateSubnetIds=<private-subnet-a>,<private-subnet-b> \
    DatabaseUrlSecretArn=<secret-arn> \
    DatabaseSecurityGroupId=<database-security-group-id> \
    CreatePrivateEndpoints=true \
    PrivateRouteTableIds=<private-route-table-id> \
    FrontendOrigin=<cloudflare-origin>
```

如果数据库是 Neon 等 VPC 外部服务，省略 `DatabaseSecurityGroupId`，必要时用
`DatabaseCidr` 收窄 5432 出站范围。外部数据库连接通过私有子网 NAT 出口。

生产域名启用 HTTPS 时额外传入同 Region 的 ACM 证书 ARN：

```text
CertificateArn=<acm-certificate-arn>
```

未提供证书时模板仅创建 HTTP listener，适合首次连通验证，不应作为长期生产配置。

## 5. 验证

读取 ALB、Lambda 和 HTTPS Function URL 输出：

```bash
aws cloudformation describe-stacks \
  --region us-west-2 \
  --stack-name jy-aigc-go-production \
  --query 'Stacks[0].Outputs'
```

ALB：

```bash
curl <ApiUrl>/health
curl <ApiUrl>/api/profile/jiaoyang
```

Cloud Map + Lambda：

```bash
aws lambda invoke \
  --region us-west-2 \
  --function-name <CloudMapProbeFunctionName> \
  /tmp/cloudmap-probe.json
```

成功响应应包含 Cloud Map 内网地址和 Go API 的 `{"status":"ok"}`。

浏览器 HTTPS API：

```bash
curl <CloudMapApiUrl>/api/profile/jiaoyang
```

确认服务发现实例：

```bash
aws servicediscovery list-instances --service-id <service-id>
```

## 6. 连接 Cloudflare 前端

把 CloudFormation 的 `CloudMapApiUrl` 输出配置为 Cloudflare Pages 的：

```text
VITE_GO_API_URL=<CloudMapApiUrl>
```

随后重新部署前端。`FrontendOrigin` 必须与浏览器实际访问的 Cloudflare origin
完全一致，否则 Go API 不会返回跨域许可头。

## 清理

Fargate、ALB、Cloud Map 和 Lambda 会产生费用。不再使用时删除运行栈：

```bash
aws cloudformation delete-stack \
  --region us-west-2 \
  --stack-name jy-aigc-go-production
```

ECR 设置了 `DeletionPolicy: Retain`。如果确定不再需要镜像，需要在确认仓库内容后
单独删除 retained repository。
