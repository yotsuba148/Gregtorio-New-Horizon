(function(){
 var quests=[
  {
    "id": 910201,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "吱吱吱...充电",
    "pre": [
      816
    ],
    "desc": "充能赛特斯石英是制作很多AE物品的基础材料.你可以让红石粉和赛特斯石英粉发生反应,得到充能赛特斯石英粉,然后使用高压釜晶化得到它.\n或者如果你有大量的钠,则可以使用化学反应釜配方. 你还可以制造充能器(AE),直接将赛特斯石英充能,但这比较慢. 充能器底部可直接与GT线缆或AE线缆连接（Gregtorio 不区分连接面，相邻的线缆即可供电）\n请注意,某些配方(相当一部分)只有一定几率出产充能赛特斯石英.\n\n（在 Gregtorio 中，用化学反应釜做充能赛特斯石英粉，再送高压釜晶化，或者直接摆一台充能器。）",
    "items": []
  },
  {
    "id": 910202,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "存储时间!",
    "pre": [
      816
    ],
    "desc": "想要搭建一个AE系统,你需要全部4种不同类型芯片的压印模板,把它们收集齐全吧! 如果你到EV阶段还未集齐它们的话,也可以通过机器直接制造.\n另外,搭建AE系统需要成吨的钛,所以先做到量产钛吧!\n\n（在 Gregtorio 中，没有阶段限制，四种压印模板在LV就能做。）",
    "items": []
  },
  {
    "id": 910203,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "福鲁伊克斯水晶",
    "pre": [
      910202
    ],
    "desc": "你可以用硬币购买一些福鲁伊克斯水晶（Gregtorio 通过合成获得）。",
    "items": []
  },
  {
    "id": 910204,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "高纯度晶体",
    "pre": [
      910203
    ],
    "desc": "高纯度的下界石英、赛特斯和福鲁伊克斯水晶可通过种子(组装沙子和晶体粉末)获得.\n将它们丢入水中可以自然生长,而在GT高压釜中可以大大加快这一过程.\n高压釜配方中,蒸馏水可以让时间减半.\n\n（在 Gregtorio 中，晶体催生仓可以直接把种子长成高纯晶体。）",
    "items": []
  },
  {
    "id": 910205,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "破坏核心和成型核心",
    "pre": [
      910204
    ],
    "desc": "成型核心——将能量转化成物质的组件。\n破坏核心——将物质转化成能量的组件。\nME网络的一切I/O接口都依赖它们。",
    "items": []
  },
  {
    "id": 910206,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "外星科技-线缆",
    "pre": [
      910203
    ],
    "desc": "如果你想在你的基地某个位置访问AE网络,那么你就需要铺设一条线缆到那个位置.你需要很多线缆. 现在使用普通的玻璃线缆或者智能线缆就能满足日常使用.但是以后,越来越多的设备需要接入网络,致密线缆和P2P通道就会派上用场了.\n玻璃线缆和包层线缆功能相同,只是外观有区别.都能携带8个频道（Gregtorio 不限制频道数量）。\n石英纤维不携带频道,但可以携带能量.这个特性可以很方便地让独立子网络使用主网络中的能量.\n你还可以为你的线缆涂色-不同颜色的线缆不会连接,利用这一点可以让不同颜色线缆并行来扩充网络容量.只有默认色的线缆才可以连接所有别的颜色的线缆.到后期用P2P通道来传输频道更有效率,可传输32频道而本身只消耗1频道.\n译者注:P2P通道不能嵌套,即用P2P通道传输的频道无法提供给另外的P2P通道————会显示设备缺少频道并且P2P通道不会工作.\n译者再注:P2P通道可以一入多出,即多个P2P通道出口可以分享一个P2P通道入口所提供的频道.\n线缆锚就像覆盖板一样,可以把你不希望连起来的两条线缆隔开.\n\n（在 Gregtorio 中，线缆染色、石英纤维供电都可用。）",
    "items": []
  },
  {
    "id": 910207,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "获得第一个AE处理器",
    "pre": [
      910202
    ],
    "desc": "有三种方法制造AE处理器. 第一,使用AE的压印器,它的速度比较慢,且一次只能容纳一份物品,还需要从特定方向输入/输出（Gregtorio 不区分输入输出方向）,不过可以用AE卡加速. 第二,还有类似的高级压印器,但这种容纳的物品可以堆叠,且不需要特定方向输入/输出. 最后,GT组装机(以及后面的多方块组装机),速度非常快,但要求流体输入,并消耗更多能量. 现在,每种电路做8个吧.\n\n（在 Gregtorio 中，压印器没有方向限制，组装机和压印器都能做。）",
    "items": []
  },
  {
    "id": 910208,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "ME控制器",
    "pre": [
      910207
    ],
    "desc": "ME网络的核心.直接向它注入能量可以给整个网络供能,不过你大概还是会想尽可能留下空间,以构建网络主体.没有ME控制器的网络只能有8个频道（Gregtorio 不限制频道数量）。\nME控制器可以构成多方块结构,能扩展至最大7x7x7,每个控制器方块最多只能在一个轴上有两个相邻的控制器方块,否则就会罢工.\n(译者注:这句话等价于:一个控制器方块在同一平面上最多只能有3个相邻的控制器方块.)\n不管那是什么意思,动手试一试就知道了,好吗? 一个ME网络只能有一个ME控制器多方块结构.\n关于频道:\n总的来说,除非特殊情况,每种设备都要占用一个频道.如果频道不足,设备就不会运行（Gregtorio 不存在这种情况）。如果无法确定是什么导致了ME网络问题,试试在相关线路上用智能线缆,或是网络可视化工具来看看频道占用.\n\n（在 Gregtorio 中，一个网络可以放多组控制器，不会冲突罢工。）",
    "items": []
  },
  {
    "id": 910209,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "存储你的ME数据",
    "pre": [
      910207,
      910206
    ],
    "desc": "这个方块只有一个功能,就是加载存储元件.\nME驱动器最大可以加载10个存储单元,所以你可以把存储空间压缩到一个很小的空间内.\nME驱动器前方的指示灯可以显示目前存储单元的状态.红色表示存储单元已经满了,橙色表示存储单元不能容纳更多类型,但是还可以存储一些物品.绿色表示存储单元类型和数量都没有满.黑色可能是没有插入存储单元,要么就是未向ME驱动器供电或者ME驱动器处于离线状态.\n注意如果没有ME网络,ME驱动器什么都做不了.它需要ME网络中有输入/输出设备.\n空载的话它需要2AE/t的能源驱动,每增加一个存储单元都会额外增加耗电量.\nME驱动器需要一个频道来运行（Gregtorio 不限制频道数量）。\n\n（在 Gregtorio 中，驱动器十个盘位在浮窗里直接显示。）",
    "items": []
  },
  {
    "id": 910210,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "1阶AE存储",
    "pre": [
      910207
    ],
    "desc": "用来制作1K和4K的存储元件.\n直接将物品存在AE存储元件中是非常高效的方案,通常也是最佳的方案.",
    "items": []
  },
  {
    "id": 910211,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "照明面板",
    "pre": [
      910201
    ],
    "desc": "所有的终端都是由此合成出来的. 所以你应该需要不少.",
    "items": []
  },
  {
    "id": 910212,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "样板终端",
    "pre": [
      910211
    ],
    "desc": "这是一种专用于编码空白样板的ME合成终端。\nME样板终端和其他终端一样可以用于浏览网络内的物品。此外，还包含了设计样板的区域。样板有两种编码模式：合成样板和处理样板。处理样板适用于不使用标准合成配方的机器，例如熔炉和各种机器。点击界面右侧的按钮可以切换编码模式：工作台图标代表合成样板模式，熔炉图标代表处理样板模式（Gregtorio 在样板终端里选好配方直接写入样板，不需要切换模式）。\n对于合成样板（“合成…”），将原料放在左侧的3x3合成网格中，终端会根据配方自动决定产物。\n对于处理样板（“制作…”），需要用对应数量的物品点击界面中的相应位置，同时指定原料（左侧）和产物（右侧）的种类和数量。如果某个处理样板配方的成功概率不为百分百（比如一些机器的副产物），处理样板将不能正常工作（因为无法获取足够的产物）。\n在合成样板模式下，只要原材料足够，就可以点击输出格取出一份产物。\n注意不要不小心启用矿物辞典替换功能。你几乎不会用到它，并且99%的时候都应该禁用它。\n\n（在 Gregtorio 中，写样板：选配方、放空白样板、编码。）",
    "items": []
  },
  {
    "id": 910213,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "配方模板",
    "pre": [
      910212
    ],
    "desc": "一个空白的模板,只要通过样板终端进行编码,就可以放入分子装配室或者ME接口中,以实现自动合成或者调用外部机器进行生产.",
    "items": []
  },
  {
    "id": 910214,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "ME接口",
    "pre": [
      910205
    ],
    "desc": "ME接口是唯一既可以用作面板也可以用作方块的组件.它的这两种形态,可以在合成栏中任意切换. 如果希望在一格中提供多个不同的接口,那么面板模式就很有用,但每个ME接口依然需要1个频道（Gregtorio 不限制频道数量）。 而方块模式则允许其他多个方块连接到同一ME接口上,这样只需要1个频道. 当与其他MOD的管道、机器或者网络连接时,ME接口作为中间的转换接口存在.\n\n（在 Gregtorio 中，把接口的样板槽填上，相邻机器就会自动收料。）",
    "items": []
  },
  {
    "id": 910215,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "ME存储总线",
    "pre": [
      910214
    ],
    "desc": "将ME存储总线贴在其他的容器上,你就可以通过ME网络来使用这个容器.这能让你在网络中使用箱子,桶,或者其他物品存储.\n通过ME存储总线的存储控制是双向的,只要ME存储总线有其需要的频道,那么它就既可以输入也可以输出（Gregtorio 不限制频道数量）。\n你可以通过存储总线的UI来控制容器可以存储哪些物品,这项设置并不会影响容器内已有物品的取出.\n它几乎可以调用任何MOD的存储模块,包括EFR(把未来带回现实)的桶,FZ(因式分解)的桶,JABBA的桶和抽屉等.也可以用在BC的管道中.\n如果你把ME存储总线贴到一个ME接口上,那么这个存储总线就可以与ME接口所在网络中的全部内容进行交互(除非这个ME接口标记了自身存储的物品,这样ME存储总线只能访问ME接口内标记的物品).\n\n（在 Gregtorio 中，把存储总线贴到箱子上就能用。）",
    "items": []
  },
  {
    "id": 910216,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "从网络中提取物品",
    "pre": [
      910205
    ],
    "desc": "ME输出总线将会从ME网络中将物品提取至容器中.需要提取的物品必须放入清单,否则输出总线将不会输出任何物品.ME输出总线会尝试输出任何在其清单上的物品.如果在网络中找不到清单中所标记的需要提取的物品,那么将跳转到下一个物品继续寻找.(有多种模式可选) 这个设备需要1个频道（Gregtorio 不限制频道数量）。 和ME输入总线功能相反.\n\n（在 Gregtorio 中，在清单里标记要取的物品，没有标记就不输出。）",
    "items": []
  },
  {
    "id": 910217,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "将物品输入网络",
    "pre": [
      910205
    ],
    "desc": "将其面对的容器中的物品输入进ME网络中. 你可以通过UI来选择提取哪些物品,或者默认将所有物品全部提取进入ME网络. 输入总线将会试图将容器内的全部物品导入网络,例如,如果网络的存储类别已经到达了最大,那么输入总线将会尝试寻找容器中已经存在于ME网络中的并且还可以继续堆叠的物品. 需要1个频道,和ME输出总线功能相反（Gregtorio 不限制频道数量）。\n当机器的处理速度很快时,最好让其直接输出到ME接口中,因为ME接口的传输是即时的.\n\n（在 Gregtorio 中，默认全部导入，也可以在界面里只留指定物品。）",
    "items": []
  },
  {
    "id": 910218,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "保持网络稳定",
    "pre": [
      910204
    ],
    "desc": "能源元件可以帮助你稳定网络中的用电波动. 它可以存储2000000AE的能源. 不过能源元件不能直接接受电能,但是可以通过ME网络进行能量缓冲.",
    "items": []
  },
  {
    "id": 910219,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "自动合成",
    "pre": [
      910210
    ],
    "desc": "这是合成处理单元的组成部分之一,这个特殊的方块并没有提供合成处理单元的功能,但是可以作为一个\"填充\"块存在. 并且也是制造合成监视器、并行处理器和不同规格的合成存储器的基础组件.",
    "items": []
  },
  {
    "id": 910220,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "1K合成存储器",
    "pre": [
      910219
    ],
    "desc": "合成处理单元的组成部分,可以提供1024字节的存储空间.\n合成存储器是合成处理单元中唯一不可缺少的组件.每一个合成处理单元都可以完成独立的合成工作(而不是同一个合成工作的子任务).合成工作包含的所有配方所需的物品越多,你就需要越多的合成存储器.使用一个大容量合成存储器配上一堆小容量的可能是个不错的主意,但要记得当你下单合成时,系统会尝试优先使用最大的那个合成存储器.合成卡请求合成也会用到合成处理单元.所以如果要大量使用合成卡的话,你需要数个独立的合成处理单元.一个合成处理单元多方块结构不论有多大,都只要一个频道（Gregtorio 不限制频道数量）。合成处理单元只有为长方体时才能成型.",
    "items": []
  },
  {
    "id": 910221,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "把组件放进去",
    "pre": [
      910210
    ],
    "desc": "一个空的存储外壳,可以放入任何的存储组件来制造一个相应大小可用的存储元件.\n你还可以直接合成出存储元件,从而跳过这一步.",
    "items": []
  },
  {
    "id": 910222,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "外星科技-自动合成",
    "pre": [
      910214
    ],
    "desc": "手动合成物品很痛苦,为什么不把它们交给外星科技呢？\n\n（在 Gregtorio 中，样板放进ME接口，接口对着分子装配室，终端里下单。）",
    "items": []
  },
  {
    "id": 910223,
    "chap": "AppliedEnergistics",
    "chapcn": "AE",
    "chapi": 30,
    "name": "终端无处不在",
    "pre": [
      910211
    ],
    "desc": "ME终端是一个交互设备，你可以通过它来访问ME网络的存储空间。ME终端具有排序、搜索、筛选的功能，需要占用一个频道。\nME合成终端是ME终端的升级版，在访问ME网络存储的功能之外，还内置了合成界面。\nME接口终端可以远程访问网络中所有接口的样板槽位（按所处的机器类型分类）。ME接口终端会显示接口对应的机器类型，但你也可以用压印器或铁砧来更改接口在ME接口终端中显示的名字。如果你经常使用末影箱将物品送到别处进行处理，这个方法或许有助于避免混乱。你还可以搜索某个特定的设备。\n\n（在 Gregtorio 中，各类终端都可以放在产线上，点开即用。）",
    "items": []
  }
];
 quests.forEach(function(q){if(GD.quests.some(function(v){return v.id===q.id;}))throw Error("Duplicate AE quest");GD.quests.push(q);});
 Object.assign(GD.questRules.rules,{
  "910201": {
    "pre": [
      816
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:item.ItemMultiMaterial@1",
            "n": 1
          }
        ]
      }
    ]
  },
  "910202": {
    "pre": [
      816
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:item.ItemMultiMaterial@35",
            "n": 1
          },
          {
            "k": "appliedenergistics2:item.ItemMultiMaterial@36",
            "n": 1
          },
          {
            "k": "appliedenergistics2:item.ItemMultiMaterial@37",
            "n": 1
          },
          {
            "k": "appliedenergistics2:item.ItemMultiMaterial@38",
            "n": 1
          }
        ]
      }
    ]
  },
  "910203": {
    "pre": [
      910202
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:item.ItemMultiMaterial@7",
            "n": 16
          }
        ]
      }
    ]
  },
  "910204": {
    "pre": [
      910203
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:item.ItemMultiMaterial@10",
            "n": 4
          },
          {
            "k": "appliedenergistics2:item.ItemMultiMaterial@11",
            "n": 4
          },
          {
            "k": "appliedenergistics2:item.ItemMultiMaterial@12",
            "n": 4
          }
        ]
      }
    ]
  },
  "910205": {
    "pre": [
      910204
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:item.ItemMultiMaterial@43",
            "n": 4
          },
          {
            "k": "appliedenergistics2:item.ItemMultiMaterial@44",
            "n": 4
          }
        ]
      }
    ]
  },
  "910206": {
    "pre": [
      910203
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:item.ItemMultiPart@16",
            "n": 32
          }
        ]
      }
    ]
  },
  "910207": {
    "pre": [
      910202
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:item.ItemMultiMaterial@22",
            "n": 8
          },
          {
            "k": "appliedenergistics2:item.ItemMultiMaterial@23",
            "n": 8
          },
          {
            "k": "appliedenergistics2:item.ItemMultiMaterial@24",
            "n": 8
          }
        ]
      }
    ]
  },
  "910208": {
    "pre": [
      910207
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:tile.BlockController@0",
            "n": 1
          }
        ]
      }
    ]
  },
  "910209": {
    "pre": [
      910207,
      910206
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:tile.BlockDrive@0",
            "n": 1
          }
        ]
      }
    ]
  },
  "910210": {
    "pre": [
      910207
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:item.ItemBasicStorageCell.1k@0",
            "n": 1
          }
        ]
      }
    ]
  },
  "910211": {
    "pre": [
      910201
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:item.ItemMultiPart@180",
            "n": 8
          }
        ]
      }
    ]
  },
  "910212": {
    "pre": [
      910211
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:item.ItemMultiPart@340",
            "n": 1
          }
        ]
      }
    ]
  },
  "910213": {
    "pre": [
      910212
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:item.ItemMultiMaterial@52",
            "n": 8
          }
        ]
      }
    ]
  },
  "910214": {
    "pre": [
      910205
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:tile.BlockInterface@0",
            "n": 1
          }
        ]
      }
    ]
  },
  "910215": {
    "pre": [
      910214
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:item.ItemMultiPart@220",
            "n": 1
          }
        ]
      }
    ]
  },
  "910216": {
    "pre": [
      910205
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:item.ItemMultiPart@260",
            "n": 1
          }
        ]
      }
    ]
  },
  "910217": {
    "pre": [
      910205
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:item.ItemMultiPart@240",
            "n": 1
          }
        ]
      }
    ]
  },
  "910218": {
    "pre": [
      910204
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:tile.BlockEnergyCell@0",
            "n": 1
          }
        ]
      }
    ]
  },
  "910219": {
    "pre": [
      910210
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:tile.BlockCraftingUnit@0",
            "n": 1
          }
        ]
      }
    ]
  },
  "910220": {
    "pre": [
      910219
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:tile.BlockCraftingStorage@0",
            "n": 1
          }
        ]
      }
    ]
  },
  "910221": {
    "pre": [
      910210
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:item.ItemMultiMaterial@39",
            "n": 1
          }
        ]
      }
    ]
  },
  "910222": {
    "pre": [
      910214
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "ae",
        "milestone": "order",
        "label": "完成一笔自动合成订单，成品回到ME存储",
        "items": []
      }
    ]
  },
  "910223": {
    "pre": [
      910211
    ],
    "preLogic": "AND",
    "taskLogic": "AND",
    "groups": [
      {
        "type": "retrieval",
        "ignoreNBT": true,
        "requireOnlyOneItem": false,
        "items": [
          {
            "k": "appliedenergistics2:item.ItemMultiPart@360",
            "n": 1
          }
        ]
      }
    ]
  }
});
})();
