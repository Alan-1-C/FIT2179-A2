import { renderCpiTrendChart } from "./cpiTrend.js";
import { renderCpiRankingChart } from "./cpiRanking.js";
import { renderCpiGrowthMap } from "./cpiGrowthMap.js";
import { renderCpiGrowthRankingChart } from "./cpiGrowthRanking.js";
import { renderCostDriverHeatmap } from "./costDriverHeatmap.js";
import { renderCategoryTrendsChart } from "./categoryTrends.js";
import { renderIncomeExpenditureChart } from "./incomeExpenditure.js";
import { renderExpenditureBurdenChart } from "./expenditureBurden.js";
import { renderPovertyPriceGrowthChart } from "./povertyPriceGrowth.js";
import { renderFinalPressureIndexChart } from "./finalPressureIndex.js";
import { renderMetricSummary } from "./dataSummary.js";

document.addEventListener("DOMContentLoaded", () => {
  renderMetricSummary().catch((error) => {
    console.error("Metric summary failed to load:", error);
  });
  renderCpiTrendChart();
  renderCpiRankingChart();
  renderCpiGrowthMap();
  renderCpiGrowthRankingChart();
  renderCostDriverHeatmap();
  renderCategoryTrendsChart();
  renderIncomeExpenditureChart();
  renderExpenditureBurdenChart();
  renderPovertyPriceGrowthChart();
  renderFinalPressureIndexChart();

  setupInteractions();
});

function setupInteractions() {
  // Intersection Observer for scroll reveal and nav active state
  const sections = document.querySelectorAll(".section-group");
  const navLinks = document.querySelectorAll(".nav-links a");

  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -100px 0px"
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        
        // Update nav active state
        const id = entry.target.getAttribute("id");
        navLinks.forEach(link => {
          link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
        });
      }
    });
  }, observerOptions);

  sections.forEach(section => observer.observe(section));

  // Handle nav click smooth scroll (optional enhancement since html has scroll-behavior: smooth)
  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href");
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        const offset = 80; // Offset for sticky nav
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    });
  });
}
