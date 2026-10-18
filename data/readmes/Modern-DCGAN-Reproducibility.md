# Deep DCGAN Reproducibility Study: Architecture & Analytics

A research-centric implementation of the [DCGAN paper](https://arxiv.org/abs/1511.06434) (Radford et al., 2015), modernized with 2018-2022 stability techniques and a professional post-training analytics pipeline.

![GAN Dashboard Placeholder](./dcgan_output/analytics_final_dashboard.png)

## 🚀 The Vision
This project isn't just about training another GAN—it's about **understanding** it. While most implementations just show you a grid of fuzzy images, this study dives deep into the "black box" of the Generator and Discriminator to visualize exactly how latent vectors become features.

### Key Highlights
*   **Modern Stability**: Upgraded the 2015 baseline with **LSGAN** (Least Squares) and **Spectral Normalization** to prevent the dreaded "vanishing gradient" problem.
*   **Deep Diagnostics**: A custom `GANAnalyzer` class that hooks into the model's internal layers to visualize learned filters and feature maps without needing to retrain.
*   **High-Fidelity Evaluation**: Automated 4-panel dashboarding for immediate assessments of model convergence and Nash Equilibrium.

---
# DCGAN Reproducibility Study: Paper vs. Modern Implementation

A formal comparison between the baseline architecture proposed by **Radford et al. (2015)** and this enhanced, high-stability version for facial/object generation.

## Executive Summary
While this project replicates the **All-Convolutional** architecture and upsampling strategy defined in the 2015 paper, it adopts several modern training paradigms discovered between 2017 and 2020. These enhancements collectively solve the "instability" and "mode collapse" issues inherent in the original BCE-based GANs.

---

## 1. Mathematical and Architectural Comparison

| Component | Radford et al. (1511.06434) | My Implementation (2026) | Technical Rationale |
| :--- | :--- | :--- | :--- |
| **Loss Function** | Binary Cross Entropy (BCE) | **Least Squares GAN (LSGAN)** | BCE suffers from vanishing gradients when the D is too strong. LSGAN (Mean Squared Error) forces the G to generate data closer to the decision boundary even when it's already "passing." |
| **D Normalization** | Batch Normalization | **Spectral Normalization** | Spectral Norm enforces a Lipschitz constant of 1, providing a mathematical guarantee against the Discriminator's gradients exploding—crucial for high-res stability. |
| **Weight Init** | Normal(0, 0.02) | **Modern Xavier/Kaiming Hybrid** | Faster convergence and better flow of gradients through deep strided convolutions. |
| **Regularization** | None | **D-Dropout (0.3)** | Prevents the Discriminator from "overfitting" on the real dataset, which often causes the Generator to fail mid-training. |
| **Labels** | Hard Labels [0, 1] | **Label Smoothing [0.1, 0.9]** | Softens the target for the Discriminator to prevent it from becoming "too confident," which helps maintain gradient flow for the Generator. |

---

## 2. Analytical Core (The "Research" Layer)
The original paper relied heavily on simple grid visualizations. This implementation introduces a dedicated **`GANAnalyzer`** framework that mirrors paper's Figure 5 but expands it with professional metrics.

### Fig 5: Filter Visualization
*   **Original Paper**: Visualized 128 randomized filters of the G's projection layer.
*   **This Project**: Extracts and plots the **RGB-channel filters** of the first D layer, showing exactly what edge/texture detectors the model learned during the 25-epoch CIFAR-10 run.

### Modern Dashboards (Not in Paper)
*   **Precision-Recall Histograms**: Overlapping probability distributions ($D(x)$ vs $D(G(z))$) are used here to detect **Mode Collapse** before it happens—a diagnostic tool not available in 2015.
*   **Feature Map Hooks**: We use PyTorch hooks to visualize the "intent" of the generator in mid-layer (e.g., at 16x16 resolution), providing a peek into how a low-dim latent vector becomes a high-dim image.

---

## 3. Conclusions for Reproducers
If we were to strictly follow the 1511.06434 paper, we would likely encounter the "jittering" loss common in early GAN research. By replacing the loss function with LSGAN and adding Spectral Normalization, we have successfully modernized the 2015 architecture to perform with 2026 levels of stability and detail.

## 🔬 Comparison: Paper vs. Reality
The original 2015 DCGAN was ground-breaking but famously unstable. This repository serves as a **Reproducibility+** study. I've kept the original "All-Convolutional" architecture but swapped the underlying "engine" for something more robust.

**Wait... what exactly is different?**
I’ve documented every architectural shift from the 2015 paper to this implementation. Check out the [Deep Paper Comparison](PAPER_COMPARISON.md) for the full breakdown of why these changes were made.

---

## 🛠️ Project Structure
```text
├── src/
│   ├── model.py        # Generator & Discriminator Architectures
│   ├── train.py        # Advanced Training Loop (LSGAN-based)
│   ├── analytics.py    # The GANAnalyzer Engine (Feature hooks, Fig 5, Dashboards)
│   ├── config.py       # Hyperparameter & Device Orchestration
│   └── dataset.py      # Multi-source Data Loading (CIFAR-10, ImageFolder)
├── notebooks/
│   ├── DCGAN_Train.ipynb            # Interactive Training Session
│   └── Post_Training_Analysis.ipynb # Professional Evaluation Suite
└── dcgan_output/       # Dashboard and Sample exports
```

---

## 📊 Analytics & Interpretation
The power of this repo lies in its **post-training suite**. You don't need to retrain the model to see what's happening inside:

1.  **Filter Visualization**: Directly extract the Discriminator's "eyes" to see what edges/textures it is looking for.
2.  **Activation Maps**: Hook into any `ConvTranspose2d` layer in the Generator to see "pre-images"—the fuzzy shapes the model builds before the final output.
3.  **Confidence Histograms**: Plot $D(x)$ vs $D(G(z))$ score distributions to see exactly how well the model separates real from fake.

---

## ⚡ Quick Start
1.  **Clone & Install**:
    ```bash
    git clone https://github.com/[your-username]/dcgan-reproducibility-study.git
    pip install torch torchvision matplotlib numpy
    ```
2.  **Train**: Open `notebooks/DCGAN_Train.ipynb` and run all cells. It will auto-download CIFAR-10 and begin the 25-epoch run.
3.  **Analyze**: After training, use `notebooks/Post_Training_Analysis.ipynb` to generate your professional 4-panel dashboard and paper-reproduced Figure 5 filters.

---

## ⚖️ License
Distributed under the MIT License. See `LICENSE` for more information.

---

## 👋 Acknowledgments
*   Original Authors: **Alec Radford, Luke Metz, Soumith Chintala** (for the 2015 DCGAN architecture).
*   The GAN Community: For the stability tricks (Spectral Norm, LSGAN) that made this study much more robust than the original.
