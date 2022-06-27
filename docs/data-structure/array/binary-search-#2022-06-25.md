---
highlight: tomorrow-night-blue
theme: smartblue
---

# 二分查找（Binary search）

原始二分查找模型就是在 **[有序数组]** 找到一个目标元素 target，并返回其索引。

## 基本模型

## 代码框架

### 左边界查找

```ts
function leftBoundV1(nums: Array<number>, target: number): number {
  if (!nums.length) return -1;
  // [left, right)
  let left = 0,
    right = nums.length;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);

    if (nums[mid] === target) {
      right = mid;
    } else if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return nums[left] === target ? left : -1;
}

function leftBoundV2(nums: Array<number>, target: number): number {
  let left = 0,
    right = nums.length;
  if (!right) return -1;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return nums[left] === target ? left : -1;
}

export const leftBound = leftBoundV2;
```

### 右边界查找

## 泛化模型

## 实战训练

## 参考文章

- [二分搜索怎么用？我又总结了套路](https://labuladong.github.io/algo/2/18/28/)
