# NVIDIA DGX Spark Research

**Research Date:** 2025-12-29
**Purpose:** Understand DGX Spark capabilities for potential integration with AI Command Center desktop application

---

## Executive Summary

The NVIDIA DGX Spark is a desktop AI supercomputer featuring the GB10 Grace Blackwell Superchip with 128GB unified memory, capable of running models up to 200B parameters. It provides multiple remote access methods (SSH, NVIDIA Sync, web dashboard), comprehensive monitoring via DCGM and nvidia-smi, and supports Docker/Kubernetes workload deployment. Key integration opportunities for an Electron app include SSH-based remote management, REST API access to model serving endpoints, DCGM Python bindings for GPU telemetry, and containerized deployment orchestration.

---

## 1. What is DGX Spark?

### Hardware Specifications

**Chip:** NVIDIA GB10 Grace Blackwell Superchip

**CPU:**
- 20 ARM cores total
  - 10 Cortex-X925 performance cores
  - 10 Cortex-A725 efficiency cores

**GPU & AI Performance:**
- Up to 1 PFLOP of sparse FP4 tensor performance
- Fifth-generation Tensor Cores with FP4 support
- AI capability roughly between RTX 5070 and 5070 Ti

**Memory:**
- 128GB LPDDR5x unified system memory (coherent between CPU and GPU)
- Up to 273 GB/s bandwidth
- Shared seamlessly across CPU and GPU (no system-to-VRAM transfers needed)

**Storage:**
- 4TB NVMe storage

**Networking:**
- Dual QSFP Ethernet ports
- 200 Gb/s aggregate bandwidth
- Supports connecting two DGX Sparks together for distributed inference

**Power:**
- 170W typical power consumption
- 240W power supply provided (required for optimal performance)

**Form Factor:**
- Compact desktop form factor
- Can operate headless or with display

### Model Capabilities

- **Fine-tuning:** Models up to 70B parameters
- **Inference (single unit):** Models up to 200B parameters
- **Inference (two units connected):** Models up to 405B parameters in FP4 with sparsity

### Pricing

- **Retail:** $3,999 USD
- **OEM versions** (HP, ASUS): Starting around $3,000 for 1TB storage variants

### Software Stack

- **Operating System:** NVIDIA DGX OS (customized Linux distribution)
  - Platform-specific optimizations
  - Pre-installed NVIDIA drivers
  - Diagnostic tools tailored for NVIDIA hardware
- **Pre-installed:** Docker Engine (CE), NVIDIA Container Runtime, NGC integration
- **Supported Frameworks:** Kubernetes, K3s, RKE2, Slurm

### How It Differs from Other DGX Systems

- **Desktop Form Factor:** Unlike rack-mounted DGX A100/H100 systems, DGX Spark is designed for individual developers
- **Unified Memory Architecture:** Single coherent memory pool vs. discrete CPU/GPU memory
- **Target Use Case:** Local development, prototyping, testing vs. data center production workloads
- **Price Point:** $3,999 vs. $100K+ for enterprise DGX systems
- **Scale:** Single-user focus vs. multi-user cluster deployments

---

## 2. Remote Connection & Management

### 2.1 Primary Access Methods

#### NVIDIA Sync (Recommended)

**Description:** Desktop application (Windows, macOS, Linux) for simplified remote access to DGX Spark over local network.

**Features:**
- Automated SSH tunnel management (no manual port forwarding)
- System tray utility with GUI
- Integrated app launching
- Detects and configures: NVIDIA AI Workbench, Cursor, VS Code
- Always provides access to DGX Dashboard

**Download:** https://build.nvidia.com/spark/connect-to-your-spark/sync

**Use Case:** Best for non-technical users or quick access without CLI knowledge.

#### SSH Access (Manual)

**Connection:**
```bash
ssh <USERNAME>@<SPARK_HOSTNAME>.local
```

**Device Discovery:** Uses mDNS (Multicast DNS) for local network discovery via `.local` suffix (e.g., `spark-abcd.local`)

**Features:**
- Direct command-line control
- Manual port forwarding capabilities
- Scriptable and automatable

**Use Case:** Best for automation, scripting, and advanced users who need fine-grained control.

### 2.2 Port Forwarding Examples

#### DGX Dashboard (Port 11000)
```bash
ssh -L 11000:localhost:11000 <USERNAME>@<SPARK_HOSTNAME>.local
```
Access at: http://localhost:11000

#### Multiple Ports (Dashboard + JupyterLab)
```bash
ssh -L 11000:localhost:11000 -L <JUPYTER_PORT>:localhost:<JUPYTER_PORT> <USERNAME>@<SPARK_IP>
```

#### Docker Model Runner (Port 12434)
```bash
ssh -N -L localhost:12435:localhost:12434 user@dgx-spark.local
```

#### Multiple Services Example
```bash
# Tunnel for Dashboard, JupyterLab, and TensorBoard
ssh -L 11000:localhost:11000 \
    -L 8888:localhost:8888 \
    -L 6006:localhost:6006 \
    user@spark.local
```

### 2.3 DGX Spark CLI Tool

**Repository:** https://github.com/jwjohns/dgx-spark-cli

**Features:**
- Simplified tunnel management
- Create, list, and kill tunnels
- Pre-configured aliases

**Example Commands:**
```bash
dgx tunnel create 8888:8888 "Jupyter Notebook"
dgx tunnel list
dgx tunnel kill <PID>
dgx tunnel kill-all

# Common aliases
dgx-jupyter='dgx tunnel create 8888:8888 "Jupyter"'
dgx-tensorboard='dgx tunnel create 6006:6006 "TensorBoard"'
```

### 2.4 Remote Access from Outside Local Network

**Option 1: Tailscale VPN**
- NVIDIA provides playbook: "Set up Tailscale on Your Spark"
- Zero-config VPN for secure remote access
- Available in DGX Spark playbooks repository

**Option 2: WireGuard VPN**
- Use DGX Spark as VPN server
- Access from external networks via VPN tunnel
- Community guide available: https://github.com/Sniper711/DGX-Spark-Day01A-Remote-Access-from-Internet-Guide-20251220A

---

## 3. Monitoring & Metrics

### 3.1 DGX Dashboard (Web Interface)

**Access:** Port 11000 (requires SSH tunnel for remote access)

**Features:**
- Real-time GPU utilization monitoring
- Memory usage visualization
- Thermal metrics (GPU temperature)
- System administration
- JupyterLab orchestration
- Software update management

**Architecture:** Browser-based dashboard served locally, integrates GPU telemetry from `nvidia-smi`

### 3.2 Command-Line Monitoring Tools

#### nvidia-smi
Basic GPU monitoring tool, pre-installed:
```bash
# Real-time monitoring (updates every 1 second)
watch -n 1 nvidia-smi

# Single snapshot
nvidia-smi
```

**Provides:**
- GPU utilization percentage
- Memory usage
- Temperature
- Power consumption
- Running processes

#### nvtop
Interactive GPU monitoring dashboard:
```bash
nvtop
```

**Displays:**
- Real-time GPU utilization
- Memory usage graphs
- Temperature monitoring
- Power consumption
- Process-level GPU usage

### 3.3 NVIDIA Data Center GPU Manager (DCGM)

#### Overview

**Description:** Suite of tools for managing and monitoring NVIDIA datacenter GPUs at scale.

**Features:**
- Active health monitoring
- Comprehensive diagnostics
- System alerts
- Governance policies (power and clock management)
- Agent-client architecture for multi-node deployments

**GitHub:** https://github.com/NVIDIA/DCGM
**Documentation:** https://docs.nvidia.com/datacenter/dcgm/latest/

#### DCGM Command-Line Interface

```bash
# Unlike nvidia-smi (single node), dcgmi is built for scale
dcgmi discovery -l  # List all GPUs
dcgmi health -c      # Health check
dcgmi stats -e       # Enable statistics collection
dcgmi stats -v       # View statistics
```

#### DCGM Python Bindings

**Installation:** Included with DCGM installer packages

**Example Usage:**
```python
from DcgmReader import DcgmReader
import time

# Initialize DCGM reader
dr = DcgmReader()

# Basic monitoring loop
while True:
    metrics = dr.GetLatestGpuValuesAsDict()
    print(f"GPU 0 Utilization: {metrics['DCGM_FI_DEV_GPU_UTIL']}")
    print(f"GPU 0 Memory: {metrics['DCGM_FI_DEV_MEM_COPY_UTIL']}")
    print(f"GPU 0 Temperature: {metrics['DCGM_FI_DEV_GPU_TEMP']} C")
    print(f"GPU 0 Power: {metrics['DCGM_FI_DEV_POWER_USAGE']} W")
    time.sleep(1)
```

**Sample Scripts (Included in DCGM):**
- `DcgmReaderExample.py` - Basic telemetry gathering
- `dcgm_collectd.py` - Collectd integration
- `dcgm_prometheus.py` - Prometheus exporter

**GitHub Examples:**
- https://github.com/NVIDIA/DCGM/blob/master/testing/python3/DcgmGroup.py
- https://github.com/NVIDIA/DCGM/tree/master/sdk_samples

#### Key DCGM Metrics Available

| Metric | Description | Field ID |
|--------|-------------|----------|
| SM Clock | SM clock frequency (MHz) | DCGM_FI_DEV_SM_CLOCK |
| Memory Clock | Memory clock frequency (MHz) | DCGM_FI_DEV_MEM_CLOCK |
| GPU Temperature | GPU temperature (°C) | DCGM_FI_DEV_GPU_TEMP |
| Memory Temperature | Memory temperature (°C) | DCGM_FI_DEV_MEMORY_TEMP |
| Power Usage | Power draw (W) | DCGM_FI_DEV_POWER_USAGE |
| GPU Utilization | GPU utilization (%) | DCGM_FI_DEV_GPU_UTIL |
| Memory Utilization | Memory utilization (%) | DCGM_FI_DEV_MEM_COPY_UTIL |

#### DCGM Exporter (Containerized Monitoring)

**Purpose:** Expose GPU metrics in Prometheus format for observability platforms.

**Deployment:**
```bash
docker run -d \
  --gpus all \
  --cap-add SYS_ADMIN \
  --network host \
  --name dcgm-exporter \
  --restart unless-stopped \
  nvcr.io/nvidia/k8s/dcgm-exporter:3.3.5-3.4.0-ubuntu22.04
```

**Integration:** Compatible with Prometheus, Grafana, OpenObserve, Datadog

**Metrics Endpoint:** http://localhost:9400/metrics (default)

### 3.4 Alternative Python Libraries for GPU Monitoring

#### GPUtil
**Repository:** https://github.com/anderskm/gputil

```python
import GPUtil

# Get list of GPUs
gpus = GPUtil.getGPUs()

for gpu in gpus:
    print(f"GPU {gpu.id}: {gpu.name}")
    print(f"  Load: {gpu.load * 100}%")
    print(f"  Memory Used: {gpu.memoryUsed}MB / {gpu.memoryTotal}MB")
    print(f"  Temperature: {gpu.temperature}°C")
```

**Advantages:** Simpler API than DCGM, uses nvidia-smi under the hood

#### nvgpu (PyPI)
**Package:** https://pypi.org/project/nvgpu/

```python
import nvgpu

# Get GPU info
info = nvgpu.gpu_info()
print(info)
```

**Advantages:** Lightweight, minimal dependencies

---

## 4. Workload Deployment & Management

### 4.1 Docker Support

#### NVIDIA Container Runtime

**Pre-installed:** Docker Engine (CE) with NVIDIA Container Runtime

**Purpose:** Bridge between Docker and NVIDIA drivers, enables GPU access from containers

**Configuration:**
```bash
# Configure Docker to use NVIDIA runtime
sudo nvidia-ctk runtime configure --runtime=docker

# Restart Docker
sudo systemctl restart docker
```

**Verify GPU Access:**
```bash
docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi
```

#### Docker Model Runner

**Description:** Run AI models with OpenAI-compatible API using familiar Docker commands.

**Installation:** Docker plugin

**Usage:**
```bash
# Pull a model
docker model pull llama3.1:8b

# Run the model (exposes OpenAI-compatible API)
docker model run llama3.1:8b

# Access API
curl http://localhost:12434/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama3.1:8b", "prompt": "Hello world"}'
```

**Port:** Default 12434 (can be tunneled via SSH)

**Benefits:**
- Full GPU acceleration
- Familiar Docker workflow
- OpenAI-compatible API
- No manual model management

### 4.2 Kubernetes Support

#### Native Kubernetes

**Supported Version:** Kubernetes 1.31.13 (verified on ARM64 Ubuntu 24.04.3 LTS)

**Prerequisites:**
```bash
# Ensure Docker uses NVIDIA Container Runtime
sudo nvidia-ctk runtime configure --runtime=docker
```

**Multi-Node Setup:** DGX Spark supports multi-node Kubernetes clusters with RDMA communication over NVIDIA ConnectX-7 SmartNIC.

**Guide:** https://medium.com/@dorangao/high-speed-rdma-on-a-two-node-kubernetes-cluster-nvidia-dgx-spark-289ad1cad1a0

#### K3s (Lightweight Kubernetes)

**Description:** CNCF-certified Kubernetes distribution for single-node and edge deployments.

**Why K3s for DGX Spark:**
- Minimal footprint
- Ideal for local development
- Perfect for CI/CD pipelines
- Rapid deployment and iteration

**Installation:** Official playbook available in DGX Spark playbooks

**Integration:** Works with NVIDIA GPU Operator for seamless GPU access

**SUSE Validation:** SUSE has successfully tested DGX Spark with K3s and RKE2

#### RKE2 (Rancher Kubernetes Engine 2)

**Description:** Enterprise-grade Kubernetes distribution by SUSE/Rancher

**Integration:** Leverages NVIDIA GPU Operator for high-performance GPU access

**Benefits:**
- Production-ready Kubernetes
- Security-focused
- Government compliance (FIPS 140-2)
- Validated by SUSE for DGX Spark

### 4.3 Container Orchestration

**Supported Orchestrators:**
- Kubernetes (native)
- K3s (lightweight)
- RKE2 (Rancher)
- Slurm (HPC workload manager)

**Container Runtimes:**
- Docker
- Singularity

### 4.4 NGC (NVIDIA GPU Cloud)

**Description:** Registry of GPU-optimized containers, pre-trained models, and AI/ML software.

**Access:** Integrated with DGX OS

**Benefits:**
- Latest frameworks optimized for Grace Blackwell architecture
- Pre-trained models
- Validated container images
- One-command deployment

**API Documentation:** https://docs.ngc.nvidia.com/ngc/api/

**Example:**
```bash
# Pull optimized container from NGC
docker pull nvcr.io/nvidia/pytorch:24.12-py3

# Run with GPU access
docker run --gpus all -it nvcr.io/nvidia/pytorch:24.12-py3
```

---

## 5. Model Serving & Inference

### 5.1 Supported Inference Engines

All inference engines expose **OpenAI-compatible REST APIs**, enabling application portability without code changes.

#### 1. NVIDIA NIM (NVIDIA Inference Microservices)

**Description:** Containerized software for fast, reliable AI model serving on NVIDIA GPUs.

**Deployment:**
```bash
# Pull NIM container
docker pull nvcr.io/nim/meta/llama-3.1-8b-instruct:latest

# Run NIM (exposes HTTP endpoint on port 8000)
docker run --gpus all \
  -e NGC_API_KEY=$NGC_API_KEY \
  -p 8000:8000 \
  nvcr.io/nim/meta/llama-3.1-8b-instruct:latest
```

**API Access:**
```bash
curl http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.1-8b-instruct", "prompt": "Explain AI"}'
```

**Available Models:**
- Llama 3.1 8B
- Qwen3-32
- Additional models via NGC catalog

**Playbook:** "NIM on Spark" - https://build.nvidia.com/spark/nim-llm

#### 2. vLLM

**Description:** High-throughput and memory-efficient inference engine.

**Features:**
- Continuous batching
- PagedAttention algorithm
- OpenAI-compatible API
- Supports wide range of models

**Playbook:** "vLLM for Inference" in DGX Spark playbooks

#### 3. TensorRT-LLM

**Description:** NVIDIA's optimized inference engine for LLMs.

**Features:**
- Maximum performance on NVIDIA GPUs
- FP8/FP4 quantization support
- Multi-GPU tensor parallelism

**Playbook:** Available in DGX Spark playbooks

#### 4. Ollama with Open WebUI

**Description:** Local model serving with web interface.

**Deployment:**
```bash
# Run Ollama
docker run -d --gpus all \
  -p 11434:11434 \
  --name ollama \
  ollama/ollama

# Pull a model
docker exec ollama ollama pull llama3.1:8b

# Run Open WebUI
docker run -d -p 3000:8080 \
  -e OLLAMA_BASE_URL=http://ollama:11434 \
  --link ollama \
  ghcr.io/open-webui/open-webui:main
```

**API:** http://localhost:11434/api/generate

**Web UI:** http://localhost:3000

**Playbook:** "Open WebUI with Ollama" in DGX Spark playbooks

#### 5. SGLang

**Description:** Fast and efficient inference server.

**Deployment:**
```bash
# Single command with Docker (pre-installed on DGX Spark)
docker run --gpus all \
  -p 30000:30000 \
  lmsysorg/sglang:latest \
  python -m sglang.launch_server \
  --model-path meta-llama/Llama-3.1-8B-Instruct \
  --port 30000
```

**Port:** 30000

#### 6. llama.cpp with GGML

**Description:** C++ implementation optimized for CPU and GPU inference.

**Features:**
- Quantized models (GGUF format)
- Multiple HTTP REST services
- Low resource usage

**Setup Guide:** https://github.com/ggml-org/llama.cpp/discussions/16514

**DGX Spark Optimization:** Build GPU version for GB10 architecture
- Guide: https://learn.arm.com/learning-paths/laptops-and-desktops/dgx_spark_llamacpp/2_gb10_llamacpp_gpu/

### 5.2 Multi-Node Model Serving

**Capability:** Two DGX Spark units can be connected via ConnectX-7 SmartNIC for distributed inference.

**Benefits:**
- Scale beyond 128GB single-node memory
- Run models up to 405B parameters (FP4 with sparsity)
- Higher throughput for concurrent requests

**Connection:** Dual QSFP Ethernet ports (200 Gb/s aggregate)

---

## 6. NVIDIA Management Tools (Enterprise)

### 6.1 NVIDIA Base Command

**Description:** Operating system of the DGX data center, powering the NVIDIA DGX platform.

#### Base Command Manager

**Purpose:** End-to-end management for heterogeneous AI/HPC clusters.

**Features:**
- Fast deployment
- Automated provisioning
- OS and firmware updates
- Real-time monitoring
- Support for 2 nodes to 100,000+ nodes
- Kubernetes orchestration
- Slurm support
- Jupyter Notebook environments

**Supported Systems:**
- DGX (A100, H100, Blackwell architecture)
- Edge systems
- Data center systems
- Multi-cloud and hybrid-cloud

**Pricing:** Free with optional enterprise support

**Use Case:** DGX Spark is a single-user system, but Base Command Manager could manage multiple DGX Spark units in a lab or small team environment.

**Documentation:** https://docs.nvidia.com/base-command-manager/index.html

### 6.2 NVIDIA Fleet Command

**Description:** Managed platform for edge AI deployment and container orchestration.

**Features:**
- Streamlined provisioning for edge systems
- Remote deployment of AI applications
- Zero-trust architecture security
- Private application registry
- Data encryption (in transit and at rest)
- Secure and measured boot

**Operational Speed:**
- Fully operational in minutes (vs. weeks)
- New devices provisioned in minutes
- New deployments created in a few clicks

**Use Case:** DGX Spark at edge locations (remote offices, labs, field deployments)

**Integration:** Works with Base Command for development → production workflow
- Develop/train models in Base Command
- Deploy models to edge with Fleet Command

**Demo:** https://www.nvidia.com/en-us/data-center/products/fleet-command/demo/

### 6.3 Applicability to DGX Spark

**Current Status:**
- DGX Spark is primarily a **single-user, desktop-class system**
- Base Command and Fleet Command are designed for **multi-node, enterprise deployments**

**When It Makes Sense:**
- **Multiple DGX Spark units** in a lab or team environment
- **Edge deployment** scenarios where DGX Spark is in remote locations
- **Centralized management** of distributed DGX Spark nodes

**Not Necessary For:**
- Single DGX Spark used for local development
- Individual developer workflows
- Home/small office use

---

## 7. SDKs & Libraries for Programmatic Control

### 7.1 GPU Monitoring & Management

#### DCGM (Recommended for Production)

**Languages:** C, Python, Go

**Python Installation:**
```bash
# Install DCGM package (includes Python bindings)
# On Ubuntu/Debian
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/datacenter-gpu-manager_3.3.9_amd64.deb
sudo dpkg -i datacenter-gpu-manager_3.3.9_amd64.deb
```

**Python API:**
```python
import dcgm_agent
import dcgm_fields

# Initialize DCGM
dcgm_agent.dcgmInit()
handle = dcgm_agent.dcgmStartEmbedded(dcgm_structs.DCGM_OPERATION_MODE_AUTO)

# Get GPU count
gpuIdList = dcgm_agent.dcgmGetAllSupportedDevices(handle)

# Create group
groupId = dcgm_agent.dcgmGroupCreate(handle,
    dcgm_structs.DCGM_GROUP_EMPTY, "mygroup")

# Add GPUs to group
for gpuId in gpuIdList:
    dcgm_agent.dcgmGroupAddDevice(handle, groupId, gpuId)

# Watch fields (metrics)
fieldGroup = dcgm_agent.dcgmFieldGroupCreate(handle, [
    dcgm_fields.DCGM_FI_DEV_GPU_UTIL,
    dcgm_fields.DCGM_FI_DEV_MEM_COPY_UTIL,
    dcgm_fields.DCGM_FI_DEV_GPU_TEMP,
    dcgm_fields.DCGM_FI_DEV_POWER_USAGE
], "myfields")

# Update frequency (1000ms)
dcgm_agent.dcgmWatchFields(handle, groupId, fieldGroup, 1000, 0, 0)

# Get latest values
values = dcgm_agent.dcgmGetLatestValuesForFields(handle, gpuId, [
    dcgm_fields.DCGM_FI_DEV_GPU_UTIL
])

# Cleanup
dcgm_agent.dcgmShutdown()
```

**GitHub:** https://github.com/NVIDIA/DCGM

#### GPUtil (Simpler Alternative)

**Installation:**
```bash
pip install gputil
```

**Usage:**
```python
import GPUtil

# Get all GPUs
gpus = GPUtil.getGPUs()

for gpu in gpus:
    print(f"GPU {gpu.id}: {gpu.name}")
    print(f"  Utilization: {gpu.load * 100:.1f}%")
    print(f"  Memory: {gpu.memoryUsed}MB / {gpu.memoryTotal}MB")
    print(f"  Temp: {gpu.temperature}°C")

# Get available GPUs (low utilization, low memory)
available = GPUtil.getAvailable(order='memory', limit=1)
```

**GitHub:** https://github.com/anderskm/gputil

#### pynvml (NVIDIA Management Library)

**Description:** Official Python bindings to NVML (used by nvidia-smi)

**Installation:**
```bash
pip install nvidia-ml-py
```

**Usage:**
```python
from pynvml import *

# Initialize
nvmlInit()

# Get GPU count
deviceCount = nvmlDeviceGetCount()

for i in range(deviceCount):
    handle = nvmlDeviceGetHandleByIndex(i)

    # GPU name
    name = nvmlDeviceGetName(handle)

    # Utilization
    util = nvmlDeviceGetUtilizationRates(handle)

    # Memory
    mem = nvmlDeviceGetMemoryInfo(handle)

    # Temperature
    temp = nvmlDeviceGetTemperature(handle, NVML_TEMPERATURE_GPU)

    # Power
    power = nvmlDeviceGetPowerUsage(handle) / 1000.0  # mW to W

    print(f"GPU {i}: {name}")
    print(f"  GPU Util: {util.gpu}%")
    print(f"  Mem Util: {util.memory}%")
    print(f"  Memory: {mem.used / 1024**2:.0f}MB / {mem.total / 1024**2:.0f}MB")
    print(f"  Temp: {temp}°C")
    print(f"  Power: {power:.1f}W")

# Cleanup
nvmlShutdown()
```

### 7.2 Docker SDK (Python)

**Installation:**
```bash
pip install docker
```

**Usage:**
```python
import docker

client = docker.from_env()

# List containers
for container in client.containers.list():
    print(f"{container.id}: {container.name} - {container.status}")

# Run GPU container
container = client.containers.run(
    "nvidia/cuda:12.0.0-base-ubuntu22.04",
    "nvidia-smi",
    device_requests=[
        docker.types.DeviceRequest(count=-1, capabilities=[['gpu']])
    ],
    remove=True,
    detach=False
)

# Get logs
print(container)

# Run model serving container
nim_container = client.containers.run(
    "nvcr.io/nim/meta/llama-3.1-8b-instruct:latest",
    detach=True,
    ports={'8000/tcp': 8000},
    device_requests=[
        docker.types.DeviceRequest(count=-1, capabilities=[['gpu']])
    ],
    environment={
        "NGC_API_KEY": "your-api-key"
    }
)

print(f"NIM running: {nim_container.name}")

# Monitor container stats
stats = nim_container.stats(stream=False)
print(stats)

# Stop container
nim_container.stop()
```

**Documentation:** https://docker-py.readthedocs.io/

**GPU Configuration:** https://github.com/NVIDIA/nvidia-docker/issues/1063

### 7.3 Docker SDK (Node.js)

**Installation:**
```bash
npm install dockerode
```

**Usage:**
```javascript
const Docker = require('dockerode');
const docker = new Docker();

// List containers
async function listContainers() {
  const containers = await docker.listContainers({ all: true });
  containers.forEach(container => {
    console.log(`${container.Id.substr(0, 12)}: ${container.Names[0]} - ${container.State}`);
  });
}

// Run GPU container
async function runGpuContainer() {
  const container = await docker.createContainer({
    Image: 'nvidia/cuda:12.0.0-base-ubuntu22.04',
    Cmd: ['nvidia-smi'],
    HostConfig: {
      DeviceRequests: [
        {
          Driver: 'nvidia',
          Count: -1,
          Capabilities: [['gpu']]
        }
      ]
    }
  });

  await container.start();

  // Get logs
  const stream = await container.logs({ follow: true, stdout: true, stderr: true });
  stream.on('data', (chunk) => console.log(chunk.toString()));

  await container.wait();
  await container.remove();
}

// Monitor container stats
async function monitorStats(containerId) {
  const container = docker.getContainer(containerId);
  const stream = await container.stats({ stream: true });

  stream.on('data', (chunk) => {
    const stats = JSON.parse(chunk.toString());
    console.log(`CPU: ${stats.cpu_stats.cpu_usage.total_usage}`);
    console.log(`Memory: ${stats.memory_stats.usage / 1024 / 1024} MB`);
  });
}

// Execute
listContainers();
runGpuContainer();
```

**Documentation:** https://github.com/apocas/dockerode

### 7.4 SSH Libraries

#### Python (Paramiko)

**Installation:**
```bash
pip install paramiko
```

**Usage:**
```python
import paramiko

# Connect
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('spark.local', username='user', password='password')

# Execute command
stdin, stdout, stderr = ssh.exec_command('nvidia-smi')
print(stdout.read().decode())

# Port forwarding (tunnel)
import paramiko.channel

transport = ssh.get_transport()
# Forward local port 11000 to remote port 11000
channel = transport.open_channel(
    "direct-tcpip",
    ("localhost", 11000),
    ("localhost", 0)
)

ssh.close()
```

#### Node.js (node-ssh)

**Installation:**
```bash
npm install node-ssh
```

**Usage:**
```javascript
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function connect() {
  await ssh.connect({
    host: 'spark.local',
    username: 'user',
    password: 'password'
  });

  // Execute command
  const result = await ssh.execCommand('nvidia-smi');
  console.log(result.stdout);

  // Port forwarding
  await ssh.forwardOut('127.0.0.1', 11000, 'localhost', 11000);

  ssh.dispose();
}

connect();
```

### 7.5 REST API Clients (for Model Serving)

#### Python (requests)

```python
import requests

# OpenAI-compatible API (NIM, vLLM, Ollama, etc.)
url = "http://localhost:8000/v1/completions"
headers = {"Content-Type": "application/json"}
data = {
    "model": "llama-3.1-8b-instruct",
    "prompt": "Explain quantum computing",
    "max_tokens": 200
}

response = requests.post(url, json=data, headers=headers)
result = response.json()
print(result['choices'][0]['text'])
```

#### JavaScript (Fetch API / Axios)

```javascript
// Using fetch
async function queryModel() {
  const response = await fetch('http://localhost:8000/v1/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instruct',
      prompt: 'Explain quantum computing',
      max_tokens: 200
    })
  });

  const result = await response.json();
  console.log(result.choices[0].text);
}

// Using Axios
const axios = require('axios');

async function queryModel() {
  const response = await axios.post('http://localhost:8000/v1/completions', {
    model: 'llama-3.1-8b-instruct',
    prompt: 'Explain quantum computing',
    max_tokens: 200
  });

  console.log(response.data.choices[0].text);
}
```

---

## 8. Practical Integration Patterns for Electron Desktop App

### 8.1 Architecture Recommendations

#### Pattern 1: SSH Tunnel + REST API Access

**Best For:** Remote model inference, dashboard monitoring

**Flow:**
1. Electron main process establishes SSH tunnel using Node.js library (node-ssh)
2. Tunnel exposes remote ports locally (11000 for dashboard, 8000 for NIM, etc.)
3. Renderer process makes HTTP requests to `localhost:PORT`
4. Display results in UI

**Example:**
```javascript
// Main process (Electron)
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function connectToDGX() {
  await ssh.connect({
    host: 'spark.local',
    username: ipcRenderer.sendSync('get-dgx-username'),
    password: ipcRenderer.sendSync('get-dgx-password')
  });

  // Tunnel DGX Dashboard
  await ssh.forwardOut('127.0.0.1', 11000, 'localhost', 11000);

  // Tunnel NIM API
  await ssh.forwardOut('127.0.0.1', 8000, 'localhost', 8000);

  return { dashboard: 'http://localhost:11000', api: 'http://localhost:8000' };
}

// Renderer process
async function queryNIM(prompt) {
  const response = await fetch('http://localhost:8000/v1/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.1-8b', prompt })
  });

  return await response.json();
}
```

#### Pattern 2: DCGM Python Service + IPC Bridge

**Best For:** Real-time GPU monitoring with live charts

**Flow:**
1. Python subprocess runs DCGM monitoring script
2. Script outputs JSON to stdout every N seconds
3. Electron main process reads stdout via IPC
4. Renderer displays charts (Chart.js, Plotly, etc.)

**Example:**

**Python script (dgx_monitor.py):**
```python
#!/usr/bin/env python3
import json
import time
from DcgmReader import DcgmReader

dr = DcgmReader()

while True:
    metrics = dr.GetLatestGpuValuesAsDict()
    output = {
        "gpu_util": metrics.get('DCGM_FI_DEV_GPU_UTIL', 0),
        "mem_util": metrics.get('DCGM_FI_DEV_MEM_COPY_UTIL', 0),
        "temperature": metrics.get('DCGM_FI_DEV_GPU_TEMP', 0),
        "power": metrics.get('DCGM_FI_DEV_POWER_USAGE', 0)
    }
    print(json.dumps(output), flush=True)
    time.sleep(1)
```

**Electron main process:**
```javascript
const { spawn } = require('child_process');
const path = require('path');

let monitorProcess = null;

function startDCGMMonitoring() {
  // Run via SSH
  monitorProcess = spawn('ssh', [
    'user@spark.local',
    'python3 /path/to/dgx_monitor.py'
  ]);

  monitorProcess.stdout.on('data', (data) => {
    try {
      const metrics = JSON.parse(data.toString());
      mainWindow.webContents.send('dgx-metrics', metrics);
    } catch (e) {
      console.error('Failed to parse metrics:', e);
    }
  });

  monitorProcess.stderr.on('data', (data) => {
    console.error('DCGM Error:', data.toString());
  });
}

// IPC handler
ipcMain.on('start-dgx-monitoring', () => {
  startDCGMMonitoring();
});
```

**Renderer process (React component):**
```javascript
import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';

function DGXMonitor() {
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    window.electronAPI.startDGXMonitoring();

    window.electronAPI.on('dgx-metrics', (data) => {
      setMetrics(prev => [...prev.slice(-60), data]); // Keep last 60 seconds
    });
  }, []);

  return (
    <div>
      <h2>DGX Spark GPU Utilization</h2>
      <Line data={{
        labels: metrics.map((_, i) => i),
        datasets: [{
          label: 'GPU Util %',
          data: metrics.map(m => m.gpu_util)
        }]
      }} />
    </div>
  );
}
```

#### Pattern 3: Docker SDK for Container Management

**Best For:** Deploying/managing inference containers, monitoring workloads

**Flow:**
1. Electron connects to Docker daemon via SSH tunnel or Docker Remote API
2. Use Dockerode (Node.js) to manage containers
3. UI provides controls for start/stop/logs

**Example:**
```javascript
const Docker = require('dockerode');

// Connect to remote Docker via SSH tunnel
const docker = new Docker({
  host: 'localhost',
  port: 2375  // Tunneled from DGX Spark
});

// IPC Handler: Deploy NIM
ipcMain.handle('deploy-nim', async (event, model) => {
  const container = await docker.createContainer({
    Image: `nvcr.io/nim/meta/${model}:latest`,
    ExposedPorts: { '8000/tcp': {} },
    HostConfig: {
      PortBindings: { '8000/tcp': [{ HostPort: '8000' }] },
      DeviceRequests: [{
        Driver: 'nvidia',
        Count: -1,
        Capabilities: [['gpu']]
      }]
    }
  });

  await container.start();
  return { id: container.id, status: 'running' };
});

// IPC Handler: Get container stats
ipcMain.handle('get-container-stats', async (event, containerId) => {
  const container = docker.getContainer(containerId);
  const stats = await container.stats({ stream: false });
  return {
    cpu: stats.cpu_stats.cpu_usage.total_usage,
    memory: stats.memory_stats.usage / 1024 / 1024
  };
});
```

### 8.2 Security Considerations

#### SSH Key-Based Authentication (Recommended)

**Setup:**
```javascript
// Store SSH private key path in secure storage (electron-store)
const Store = require('electron-store');
const store = new Store({ encryptionKey: 'your-encryption-key' });

store.set('dgx.sshKeyPath', '/path/to/id_rsa');

// Use key for authentication
await ssh.connect({
  host: 'spark.local',
  username: 'user',
  privateKeyPath: store.get('dgx.sshKeyPath')
});
```

#### Credentials Storage

**Use:** electron-store with encryption, or OS keychain (keytar)

```javascript
const keytar = require('keytar');

// Store credentials
await keytar.setPassword('ai-command-center', 'dgx-spark-user', 'password123');

// Retrieve credentials
const password = await keytar.getPassword('ai-command-center', 'dgx-spark-user');
```

#### Network Access Control

- **mDNS Discovery:** Use `mdns` or `bonjour` Node.js libraries to auto-discover DGX Spark on local network
- **Tailscale Integration:** For remote access, integrate Tailscale client
- **VPN Support:** Detect VPN status before attempting connections

### 8.3 UI/UX Patterns

#### Dashboard Module Example

**Features:**
- Connection status indicator
- Real-time GPU utilization chart
- Temperature/Power gauges
- Container list with start/stop controls
- Model deployment wizard

**Components:**
```
src/components/dgx-spark/
  ├── DGXConnection.jsx       # Connection setup/status
  ├── GPUMonitor.jsx          # Real-time GPU charts
  ├── ContainerManager.jsx    # Docker container controls
  ├── ModelDeployer.jsx       # NIM/vLLM deployment wizard
  └── SystemInfo.jsx          # Hardware specs, OS version
```

#### State Management

```javascript
// dgxService.js
class DGXService {
  constructor() {
    this.connected = false;
    this.ssh = null;
    this.docker = null;
  }

  async connect(host, username, password) {
    this.ssh = await this.establishSSH(host, username, password);
    this.docker = await this.setupDockerClient();
    this.connected = true;
    return { dashboard: 'http://localhost:11000', api: 'http://localhost:8000' };
  }

  async getGPUMetrics() {
    const { stdout } = await this.ssh.execCommand('nvidia-smi --query-gpu=utilization.gpu,temperature.gpu,power.draw --format=csv,noheader,nounits');
    const [util, temp, power] = stdout.split(',').map(Number);
    return { util, temp, power };
  }

  async deployModel(modelName) {
    // Deploy via Docker SDK
  }
}

export default new DGXService();
```

### 8.4 Integration Checklist

- [ ] SSH connection with key-based auth
- [ ] Auto-discovery via mDNS (`.local` hostname)
- [ ] Port forwarding setup (11000, 8000, custom ports)
- [ ] DCGM or nvidia-smi monitoring integration
- [ ] Docker SDK for container management
- [ ] OpenAI-compatible API client for model queries
- [ ] Real-time charts (GPU util, temp, power)
- [ ] Container logs viewer
- [ ] Model deployment wizard (NIM, vLLM, Ollama)
- [ ] Connection status persistence (reconnect on app restart)
- [ ] Error handling (connection lost, SSH timeout, API errors)
- [ ] Settings page (DGX host, credentials, refresh rate)

---

## 9. Key Takeaways

1. **DGX Spark is a Desktop AI Supercomputer**
   - 128GB unified memory, 1 PFLOP FP4 performance, $3,999
   - Runs models up to 200B parameters (single unit) or 405B (two units connected)
   - Pre-installed Docker, NVIDIA Container Runtime, NGC integration

2. **Remote Access is Well-Supported**
   - NVIDIA Sync (GUI app for Windows/Mac/Linux) - easiest option
   - SSH with port forwarding - most flexible for automation
   - DGX Dashboard (web UI on port 11000) - monitoring and management
   - Tailscale/WireGuard VPN for remote access outside local network

3. **Monitoring via Multiple Methods**
   - **nvidia-smi:** Quick command-line checks
   - **nvtop:** Interactive terminal dashboard
   - **DCGM:** Enterprise-grade monitoring with Python/C/Go APIs
   - **DGX Dashboard:** Web-based real-time visualization
   - **DCGM Exporter:** Prometheus metrics for Grafana/observability platforms

4. **Workload Deployment is Docker-Centric**
   - Docker with NVIDIA Container Runtime pre-configured
   - Supports Kubernetes, K3s, RKE2 for orchestration
   - NGC provides optimized containers for Grace Blackwell architecture

5. **Model Serving Has Many Options**
   - **NVIDIA NIM:** Production-ready, containerized, OpenAI-compatible
   - **vLLM:** High-throughput, memory-efficient
   - **Ollama + Open WebUI:** Easiest for local experimentation
   - **llama.cpp:** Quantized models, low resource usage
   - All expose OpenAI-compatible REST APIs

6. **Programmatic Control is Possible**
   - **Python:** DCGM bindings, docker SDK, paramiko (SSH), requests (API)
   - **Node.js:** dockerode, node-ssh, fetch/axios
   - **REST APIs:** All inference engines expose HTTP endpoints
   - **IPC Patterns:** Python subprocess → Electron main → renderer

7. **Enterprise Tools (Optional)**
   - **Base Command Manager:** For managing multiple DGX units
   - **Fleet Command:** For edge deployments
   - Not required for single-user DGX Spark

---

## 10. Next Steps for Integration

### Immediate Actions

1. **Proof of Concept: SSH Connection**
   - Implement SSH tunnel in Electron using node-ssh
   - Connect to DGX Dashboard (port 11000)
   - Display in embedded webview or external browser

2. **GPU Monitoring MVP**
   - Execute `nvidia-smi` via SSH, parse output
   - Display GPU utilization, temperature, memory usage
   - Update every 2-5 seconds

3. **Model Query Test**
   - Tunnel to NIM/Ollama API (port 8000 or 11434)
   - Send test prompt, display response
   - Measure latency

### Phase 2 (Advanced Features)

1. **Container Management**
   - List running containers (Docker SDK)
   - Start/stop inference services
   - View logs

2. **Real-Time Charts**
   - Integrate DCGM Python bindings
   - Stream metrics to Electron renderer
   - Display with Chart.js or Plotly

3. **Model Deployment Wizard**
   - UI to select model (NIM catalog)
   - Pull container, configure, deploy
   - Health check and status monitoring

### Phase 3 (Production Ready)

1. **Multi-DGX Support**
   - Manage multiple DGX Spark units
   - Switch between connections
   - Aggregate monitoring

2. **Advanced Orchestration**
   - Deploy multi-container stacks
   - Kubernetes integration (optional)
   - Job scheduling

3. **Security Hardening**
   - Encrypted credential storage
   - SSH key management
   - Audit logging

---

## 11. Sources

### Official Documentation
- [NVIDIA DGX Spark User Guide](https://docs.nvidia.com/dgx/dgx-spark/index.html)
- [DGX Spark Hardware Overview](https://docs.nvidia.com/dgx/dgx-spark/hardware.html)
- [NVIDIA DGX Spark Product Page](https://www.nvidia.com/en-us/products/workstations/dgx-spark/)
- [DGX Spark Marketplace](https://marketplace.nvidia.com/en-us/enterprise/personal-ai-supercomputers/dgx-spark/)
- [Set Up Local Network Access](https://build.nvidia.com/spark/connect-to-your-spark)
- [NVIDIA Sync Documentation](https://docs.nvidia.com/dgx/dgx-spark/nvidia-sync.html)
- [DGX Dashboard Instructions](https://build.nvidia.com/spark/dgx-dashboard/instructions)
- [NGC Documentation](https://docs.nvidia.com/dgx/dgx-spark/ngc.html)
- [NVIDIA Container Runtime for Docker](https://docs.nvidia.com/dgx/dgx-spark/nvidia-container-runtime-for-docker.html)

### NVIDIA Developer Resources
- [NVIDIA DCGM](https://developer.nvidia.com/dcgm)
- [NVIDIA DCGM GitHub](https://github.com/NVIDIA/DCGM)
- [NVIDIA Container Toolkit GitHub](https://github.com/NVIDIA/nvidia-container-toolkit)
- [NVIDIA Base Command](https://www.nvidia.com/en-us/data-center/base-command/)
- [NVIDIA Fleet Command](https://www.nvidia.com/en-us/data-center/products/fleet-command/)
- [NGC API Documentation](https://docs.ngc.nvidia.com/ngc/api/)

### Community Resources
- [DGX Spark Playbooks (GitHub)](https://github.com/NVIDIA/dgx-spark-playbooks)
- [DGX Spark CLI Tool](https://github.com/jwjohns/dgx-spark-cli)
- [WireGuard VPN Setup Guide](https://github.com/Sniper711/DGX-Spark-Day01A-Remote-Access-from-Internet-Guide-20251220A)
- [NVIDIA Developer Forums - DGX Spark](https://forums.developer.nvidia.com/c/dgx-spark/)

### Technical Articles & Reviews
- [NVIDIA DGX Spark In-Depth Review - LMSYS](https://lmsys.org/blog/2025-10-13-nvidia-dgx-spark/)
- [NVIDIA DGX Spark: great hardware, early days for the ecosystem - Simon Willison](https://simonwillison.net/2025/Oct/14/nvidia-dgx-spark/)
- [NVIDIA DGX Spark Review - IntuitionLabs](https://intuitionlabs.ai/articles/nvidia-dgx-spark-review)
- [Docker Model Runner on DGX Spark](https://www.docker.com/blog/new-nvidia-dgx-spark-docker-model-runner/)
- [High-Speed RDMA on Two-Node Kubernetes Cluster](https://medium.com/@dorangao/high-speed-rdma-on-a-two-node-kubernetes-cluster-nvidia-dgx-spark-289ad1cad1a0)
- [Getting Started with NVIDIA DGX Spark: Open WebUI & ComfyUI](https://medium.com/@dorangao/getting-started-with-nvidia-dgx-spark-open-webui-comfyui-setup-guide-ba3eb902f2c3)
- [Desktop AI Revolution: SUSE and NVIDIA](https://www.suse.com/c/the-desktop-ai-revolution-powered-by-suse-and-nvidia/)
- [Setting Up GPU Telemetry with DCGM](https://developer.nvidia.com/blog/gpu-telemetry-nvidia-dcgm/)
- [NVIDIA GPU Monitoring with DCGM Exporter and OpenObserve](https://openobserve.ai/blog/how-to-monitor-nvidia-gpu/)

### Inference & Model Serving
- [NIM on Spark](https://build.nvidia.com/spark/nim-llm)
- [Choosing an Inference Engine](https://deepwiki.com/NVIDIA/dgx-spark-playbooks/4.1-vllm)
- [llama.cpp on DGX Spark Guide](https://github.com/ggml-org/llama.cpp/discussions/16514)
- [GPU Version of llama.cpp on GB10](https://learn.arm.com/learning-paths/laptops-and-desktops/dgx_spark_llamacpp/2_gb10_llamacpp_gpu/)
- [NVIDIA DGX Spark for Vision AI - Roboflow](https://blog.roboflow.com/nvidia-dgx-spark-for-vision-ai/)

### SDK & Library Documentation
- [GPUtil GitHub](https://github.com/anderskm/gputil)
- [nvgpu PyPI](https://pypi.org/project/nvgpu/)
- [Docker SDK for Python](https://docker-py.readthedocs.io/)
- [Dockerode (Node.js)](https://github.com/apocas/dockerode)
- [NVIDIA Container Runtime](https://developer.nvidia.com/container-runtime)

---

## Appendix: Quick Reference Commands

### Connection & Tunneling
```bash
# Basic SSH connection
ssh user@spark.local

# Tunnel DGX Dashboard
ssh -L 11000:localhost:11000 user@spark.local

# Tunnel multiple ports
ssh -L 11000:localhost:11000 -L 8000:localhost:8000 user@spark.local

# Tunnel Docker Model Runner
ssh -N -L localhost:12435:localhost:12434 user@dgx-spark.local
```

### Monitoring
```bash
# nvidia-smi (real-time)
watch -n 1 nvidia-smi

# nvtop (interactive)
nvtop

# DCGM discovery
dcgmi discovery -l

# DCGM health check
dcgmi health -c

# DCGM stats
dcgmi stats -e  # Enable
dcgmi stats -v  # View
```

### Docker
```bash
# Test GPU access
docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi

# List containers
docker ps

# Container logs
docker logs <container-id>

# Container stats
docker stats <container-id>
```

### Model Serving
```bash
# NIM (port 8000)
docker run --gpus all -e NGC_API_KEY=$KEY -p 8000:8000 nvcr.io/nim/meta/llama-3.1-8b-instruct:latest

# Ollama (port 11434)
docker run -d --gpus all -p 11434:11434 ollama/ollama
docker exec ollama ollama pull llama3.1:8b

# Query OpenAI-compatible API
curl http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.1-8b", "prompt": "Hello"}'
```

### Kubernetes
```bash
# K3s status
sudo systemctl status k3s

# List nodes
kubectl get nodes

# List pods
kubectl get pods -A

# Deploy GPU pod
kubectl run gpu-test --rm -it --restart=Never --image=nvidia/cuda:12.0.0-base-ubuntu22.04 -- nvidia-smi
```

---

**END OF RESEARCH DOCUMENT**
