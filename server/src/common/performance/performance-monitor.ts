/**
 * 性能监控工具
 *
 * 功能：
 * 1. 记录 API 响应时间
 * 2. 记录数据库查询时间
 * 3. 记录页面加载时间
 * 4. 统计内存使用情况
 */

export interface PerformanceMetrics {
  name: string
  duration: number
  timestamp: number
  metadata?: Record<string, any>
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private startTime: number = Date.now()

  /**
   * 记录性能指标
   */
  record(name: string, duration: number, metadata?: Record<string, any>) {
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
      metadata
    })
  }

  /**
   * 获取所有性能指标
   */
  getMetrics(): PerformanceMetrics[] {
    return this.metrics
  }

  /**
   * 获取特定指标
   */
  getMetricsByName(name: string): PerformanceMetrics[] {
    return this.metrics.filter(m => m.name === name)
  }

  /**
   * 获取平均耗时
   */
  getAverageDuration(name: string): number {
    const metrics = this.getMetricsByName(name)
    if (metrics.length === 0) return 0

    const total = metrics.reduce((sum, m) => sum + m.duration, 0)
    return total / metrics.length
  }

  /**
   * 获取最大耗时
   */
  getMaxDuration(name: string): number {
    const metrics = this.getMetricsByName(name)
    if (metrics.length === 0) return 0

    return Math.max(...metrics.map(m => m.duration))
  }

  /**
   * 获取最小耗时
   */
  getMinDuration(name: string): number {
    const metrics = this.getMetricsByName(name)
    if (metrics.length === 0) return 0

    return Math.min(...metrics.map(m => m.duration))
  }

  /**
   * 获取总耗时
   */
  getTotalDuration(name: string): number {
    const metrics = this.getMetricsByName(name)
    return metrics.reduce((sum, m) => sum + m.duration, 0)
  }

  /**
   * 清空指标
   */
  clear() {
    this.metrics = []
    this.startTime = Date.now()
  }

  /**
   * 获取运行时间
   */
  getUptime(): number {
    return Date.now() - this.startTime
  }

  /**
   * 获取统计报告
   */
  getReport(): Record<string, any> {
    const names = [...new Set(this.metrics.map(m => m.name))]
    const report: Record<string, any> = {
      uptime: this.getUptime(),
      totalRequests: this.metrics.length,
      byName: {}
    }

    names.forEach(name => {
      const metrics = this.getMetricsByName(name)
      report.byName[name] = {
        count: metrics.length,
        average: this.getAverageDuration(name),
        min: this.getMinDuration(name),
        max: this.getMaxDuration(name),
        total: this.getTotalDuration(name),
        p50: this.getPercentile(name, 50),
        p95: this.getPercentile(name, 95),
        p99: this.getPercentile(name, 99)
      }
    })

    return report
  }

  /**
   * 获取百分位数
   */
  private getPercentile(name: string, percentile: number): number {
    const metrics = this.getMetricsByName(name)
    if (metrics.length === 0) return 0

    const sorted = metrics.map(m => m.duration).sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[index] || 0
  }
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor()

/**
 * 性能监控装饰器
 */
export function MeasurePerformance(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const metricName = name || `${target.constructor.name}.${propertyKey}`

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now()

      try {
        const result = await originalMethod.apply(this, args)
        const duration = Date.now() - startTime

        performanceMonitor.record(metricName, duration, {
          success: true
        })

        return result
      } catch (error) {
        const duration = Date.now() - startTime

        performanceMonitor.record(metricName, duration, {
          success: false,
          error: error.message
        })

        throw error
      }
    }

    return descriptor
  }
}

/**
 * 异步函数性能监控
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()

  try {
    const result = await fn()
    const duration = Date.now() - startTime

    performanceMonitor.record(name, duration, {
      success: true
    })

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    performanceMonitor.record(name, duration, {
      success: false,
      error: error.message
    })

    throw error
  }
}

/**
 * 同步函数性能监控
 */
export function measure<T>(name: string, fn: () => T): T {
  const startTime = Date.now()

  try {
    const result = fn()
    const duration = Date.now() - startTime

    performanceMonitor.record(name, duration, {
      success: true
    })

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    performanceMonitor.record(name, duration, {
      success: false,
      error: error.message
    })

    throw error
  }
}
