import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import ImportPage from '../views/ImportPage.vue'
import QuestionList from '../views/QuestionList.vue'
import ReviewPage from '../views/ReviewPage.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/import',
      name: 'import',
      component: ImportPage
    },
    {
      path: '/questions',
      name: 'questions',
      component: QuestionList
    },
    {
      path: '/review/:id',
      name: 'review',
      component: ReviewPage
    }
  ]
})

export default router
