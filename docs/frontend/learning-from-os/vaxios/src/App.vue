<template>
  <div>
    <h1>测试请求</h1>
    <el-button @click="handleRequest()">click</el-button>
  </div>

  <div>
    <h1>测试重复请求</h1>
    <el-button @click="handleRepeatRequest()">click</el-button>
  </div>

  <div>
    <h1>测试加入时间戳</h1>
    <el-button @click="handleRequestWithTimestamp()">click</el-button>
  </div>

  <div>
    <h1>
      测试携带 token
    </h1>
    <el-button @click="handleAddToken()">添加 token</el-button>
    <el-button @click="handleRemoveToken()">删除 token</el-button>
    <el-button @click="handleRequestWithToken()">发起携带 token 请求</el-button>
    <el-button @click="handleRequestWithoutToken()"
      >发起不携带 token 请求</el-button
    >
  </div>

  <div>
    <h1>
      测试异常
    </h1>
    <el-button @click="handleRequestError()">
      测试异常
    </el-button>
    <el-button @click="handleRequestError(true)">
      测试异常（捕获）
    </el-button>
  </div>

  <div>
    <h1>
      测试超时
    </h1>
    <el-button @click="handleRequestTimeout()">
      测试超时不发起请求
    </el-button>
    <el-button @click="handleRequestTimeout(true)">
      测试超时重新发起请求
    </el-button>
  </div>

  <div>
    <h1>
      测试发起请求时显示 loading
    </h1>
    <el-button @click="handleRequestWithLoading(true)">
      测试发起请求时显示 loading
    </el-button>
  </div>
</template>

<script setup>
import { defaultHttp } from "@/vaxios";
import { ElMessage, ElLoading } from "element-plus";

const handleRequest = () => {
  defaultHttp.get({
    url: "/data",
  });
};

const handleRequestWithTimestamp = () => {
  defaultHttp.get(
    {
      url: "/data",
    },
    {
      joinTime: true,
    }
  );
};

const handleRepeatRequest = () => {
  console.log("发起第一个请求");
  defaultHttp.get({
    url: "/data",
  });

  console.log("发起第二个请求");
  defaultHttp.get({
    url: "/data",
  });
};

const handleAddToken = () => {
  window.localStorage.setItem("token", "fake token");
  ElMessage({ type: "success", message: "添加 token 成功" });
};
const handleRemoveToken = () => {
  window.localStorage.removeItem("token");
  ElMessage({ type: "success", message: "删除 token 成功" });
};
const handleRequestWithToken = () => {
  defaultHttp.get({
    url: "/secret",
  });
};
const handleRequestWithoutToken = () => {
  defaultHttp.get(
    {
      url: "/secret",
    },
    {
      withToken: false,
    }
  );
};

const handleRequestError = (isCatchError) => {
  defaultHttp.get(
    {
      url: "/error",
    },
    {
      isCatchError,
      onError({ message, type }) {
        ElMessage({
          type,
          message,
        });
      },
    }
  );
};

const handleRequestTimeout = (isOpenRetry = false) => {
  defaultHttp.get(
    {
      url: "/sleep",
      // 最大超时时间为 300ms
      timeout: 300,
    },
    {
      retryRequest: {
        isOpenRetry,
      },
    }
  );
};

const handleRequestWithLoading = () => {
  let instance;
  defaultHttp.get(
    {
      url: "/sleep",
    },
    {
      isLoadingWhenRequest: true,
      openLoading: () => {
        instance = ElLoading.service({ fullscreen: true });
      },
      closeLoading: () => {
        if (instance != null) instance.close();
      },
    }
  );
};
</script>

<style scoped></style>
